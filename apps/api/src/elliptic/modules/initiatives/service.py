"""Initiative business logic."""

import uuid

from sqlalchemy import Float, case, cast, delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.initiatives.models import (
    Initiative,
    InitiativeUpdate,
    initiative_projects,
)
from elliptic.modules.initiatives.schemas import (
    InitiativeCreateIn,
    InitiativeUpdateCreateIn,
    InitiativeUpdateIn,
)
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import (
    PROGRESS_EXCLUDED_STATUSES,
    STATUS_TO_CATEGORY,
    StatusCategory,
    Task,
    TaskStatus,
)


async def get_initiative(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID
) -> Initiative:
    initiative = await session.scalar(
        select(Initiative).where(Initiative.id == initiative_id, Initiative.org_id == ctx.org.id)
    )
    if initiative is None:
        raise NotFoundError("Initiative not found")
    return initiative


async def create_initiative(
    session: AsyncSession, ctx: OrgContext, payload: InitiativeCreateIn
) -> Initiative:
    """Create an org-scoped initiative."""
    initiative = Initiative(
        org_id=ctx.org.id,
        name=payload.name,
        description=payload.description,
        target_date=payload.target_date,
        created_by=ctx.user.id,
    )
    session.add(initiative)
    await session.flush()
    return initiative


async def list_initiatives(session: AsyncSession, ctx: OrgContext) -> list[Initiative]:
    """List the org's initiatives, newest first."""
    result = await session.scalars(
        select(Initiative)
        .where(Initiative.org_id == ctx.org.id)
        .order_by(Initiative.created_at.desc())
    )
    return list(result)


async def _project_ids(session: AsyncSession, initiative_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await session.scalars(
        select(initiative_projects.c.project_id).where(
            initiative_projects.c.initiative_id == initiative_id
        )
    )
    return list(rows)


_STARTED_STATUSES = [s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.STARTED]
_TODO_STATUSES = [
    s
    for s, c in STATUS_TO_CATEGORY.items()
    if c in (StatusCategory.BACKLOG, StatusCategory.UNSTARTED)
]
_TASK_WEIGHT = cast(
    case((Task.estimate.op("~")(r"^[0-9]+(\.[0-9]+)?$"), Task.estimate), else_="1"),
    Float,
)


async def initiative_rollups(
    session: AsyncSession, initiative_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, float]]:
    """Per-initiative rollup across linked projects: counts, state groups, and a weighted %.

    weighted_* sum estimate points (numeric estimates as their value, unestimated
    tasks as 1) so a project's heavy items count more than its trivial ones.
    """
    if not initiative_ids:
        return {}
    empty = {
        "project_count": 0.0,
        "task_total": 0.0,
        "task_done": 0.0,
        "task_started": 0.0,
        "task_todo": 0.0,
        "weighted_total": 0.0,
        "weighted_done": 0.0,
    }
    rollups: dict[uuid.UUID, dict[str, float]] = {iid: dict(empty) for iid in initiative_ids}
    rows = await session.execute(
        select(
            initiative_projects.c.initiative_id,
            func.count(func.distinct(Project.id)),
            func.count(Task.id).filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
            func.count(Task.id).filter(Task.status == TaskStatus.DONE),
            func.count(Task.id).filter(Task.status.in_(_STARTED_STATUSES)),
            func.count(Task.id).filter(Task.status.in_(_TODO_STATUSES)),
            func.coalesce(
                func.sum(_TASK_WEIGHT).filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)), 0.0
            ),
            func.coalesce(func.sum(_TASK_WEIGHT).filter(Task.status == TaskStatus.DONE), 0.0),
        )
        .select_from(initiative_projects)
        .join(Project, Project.id == initiative_projects.c.project_id)
        .outerjoin(Task, Task.project_id == Project.id)
        .where(initiative_projects.c.initiative_id.in_(initiative_ids))
        .group_by(initiative_projects.c.initiative_id)
    )
    for row in rows:
        rollups[row[0]] = {
            "project_count": row[1],
            "task_total": row[2],
            "task_done": row[3],
            "task_started": row[4],
            "task_todo": row[5],
            "weighted_total": float(row[6]),
            "weighted_done": float(row[7]),
        }
    return rollups


async def update_initiative(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID, payload: InitiativeUpdateIn
) -> Initiative:
    """Apply updates to an initiative."""
    initiative = await get_initiative(session, ctx, initiative_id)
    if payload.name is not None:
        initiative.name = payload.name
    if payload.description is not None:
        initiative.description = payload.description or None
    if payload.target_date is not None:
        initiative.target_date = payload.target_date
    if payload.status is not None:
        initiative.status = payload.status
    await session.flush()
    return initiative


async def delete_initiative(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID
) -> None:
    """Delete an initiative (project links are removed, projects untouched)."""
    initiative = await get_initiative(session, ctx, initiative_id)
    await session.delete(initiative)
    await session.flush()


async def _project_in_org(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def add_project(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID, project_id: uuid.UUID
) -> None:
    """Link a project to an initiative."""
    await get_initiative(session, ctx, initiative_id)
    await _project_in_org(session, ctx, project_id)
    existing = await session.scalar(
        select(initiative_projects.c.project_id).where(
            initiative_projects.c.initiative_id == initiative_id,
            initiative_projects.c.project_id == project_id,
        )
    )
    if existing is not None:
        raise ConflictError("Project is already in this initiative")
    await session.execute(
        insert(initiative_projects).values(initiative_id=initiative_id, project_id=project_id)
    )
    await session.flush()


async def remove_project(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID, project_id: uuid.UUID
) -> None:
    """Unlink a project from an initiative."""
    await get_initiative(session, ctx, initiative_id)
    await session.execute(
        delete(initiative_projects).where(
            initiative_projects.c.initiative_id == initiative_id,
            initiative_projects.c.project_id == project_id,
        )
    )
    await session.flush()


async def list_projects(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID
) -> list[tuple[Project, int, int]]:
    """List an initiative's projects with each project's task rollup."""
    await get_initiative(session, ctx, initiative_id)
    rows = await session.execute(
        select(
            Project,
            func.count(Task.id).filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
            func.count(Task.id).filter(Task.status == TaskStatus.DONE),
        )
        .select_from(initiative_projects)
        .join(Project, Project.id == initiative_projects.c.project_id)
        .outerjoin(Task, Task.project_id == Project.id)
        .where(initiative_projects.c.initiative_id == initiative_id)
        .group_by(Project.id)
        .order_by(Project.name)
    )
    return [(project, total, done) for project, total, done in rows]


async def create_initiative_update(
    session: AsyncSession,
    ctx: OrgContext,
    initiative_id: uuid.UUID,
    payload: InitiativeUpdateCreateIn,
) -> InitiativeUpdate:
    """Post a RAG health + summary update on an initiative."""
    initiative = await get_initiative(session, ctx, initiative_id)
    update = InitiativeUpdate(
        org_id=ctx.org.id,
        initiative_id=initiative.id,
        health=payload.health,
        summary=payload.summary,
        created_by=ctx.user.id,
    )
    session.add(update)
    await session.flush()
    return update


async def list_initiative_updates(
    session: AsyncSession, ctx: OrgContext, initiative_id: uuid.UUID
) -> list[InitiativeUpdate]:
    """List an initiative's progress updates, newest first."""
    initiative = await get_initiative(session, ctx, initiative_id)
    result = await session.scalars(
        select(InitiativeUpdate)
        .where(InitiativeUpdate.initiative_id == initiative.id)
        .order_by(InitiativeUpdate.created_at.desc())
    )
    return list(result)
