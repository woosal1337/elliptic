"""Cycle business logic."""

import uuid
from datetime import date, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.cycles.models import Cycle, CycleStatus
from elliptic.modules.cycles.schemas import CycleCreateIn, CycleUpdateIn
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import (
    PROGRESS_EXCLUDED_STATUSES,
    STATUS_TO_CATEGORY,
    StatusCategory,
    Task,
    TaskStatus,
)
from elliptic.modules.teams.models import TeamProjectLink

_INCOMPLETE_STATUSES = [
    status
    for status, category in STATUS_TO_CATEGORY.items()
    if category not in (StatusCategory.COMPLETED, StatusCategory.CANCELLED)
]
_COMPLETED_STATUSES = [
    status
    for status, category in STATUS_TO_CATEGORY.items()
    if category == StatusCategory.COMPLETED
]


def _require_not_locked(cycle: Cycle) -> None:
    """A completed cycle is immutable — its scope and final counts are frozen (COS-109)."""
    if cycle.status == CycleStatus.COMPLETED:
        raise BadRequestError("This cycle is completed and locked")


async def _validate_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    row = await session.scalar(
        select(Project.id).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if row is None:
        raise NotFoundError("Project not found")


async def get_cycle(session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID) -> Cycle:
    cycle = await session.scalar(
        select(Cycle).where(Cycle.id == cycle_id, Cycle.org_id == ctx.org.id)
    )
    if cycle is None:
        raise NotFoundError("Cycle not found")
    return cycle


async def create_cycle(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: CycleCreateIn
) -> Cycle:
    """Create a cycle in a project."""
    await _validate_project(session, ctx, project_id)
    if payload.start_date and payload.end_date and payload.end_date < payload.start_date:
        raise BadRequestError("Cycle end date cannot precede its start date")
    cycle = Cycle(
        org_id=ctx.org.id,
        project_id=project_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    session.add(cycle)
    await session.flush()
    return cycle


async def generate_recurring_cycles(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    *,
    base_title: str,
    count: int,
    duration_weeks: int,
    cooldown_days: int,
    start_date: date,
    start_index: int = 1,
) -> list[Cycle]:
    """Generate a series of future cycles on a recurring cadence (COS-85).

    Each cycle spans ``duration_weeks`` weeks; the next begins ``cooldown_days``
    after the previous one ends. Names are ``"{base_title} {n}"``.
    """
    await _validate_project(session, ctx, project_id)
    created: list[Cycle] = []
    cursor = start_date
    for offset in range(count):
        end = cursor + timedelta(weeks=duration_weeks) - timedelta(days=1)
        cycle = Cycle(
            org_id=ctx.org.id,
            project_id=project_id,
            name=f"{base_title} {start_index + offset}",
            start_date=cursor,
            end_date=end,
        )
        session.add(cycle)
        created.append(cycle)
        cursor = end + timedelta(days=1 + cooldown_days)
    await session.flush()
    return created


async def list_cycles(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> list[Cycle]:
    """List a project's cycles, newest start date first."""
    await _validate_project(session, ctx, project_id)
    result = await session.scalars(
        select(Cycle)
        .where(Cycle.project_id == project_id, Cycle.org_id == ctx.org.id)
        .order_by(Cycle.start_date.desc().nullslast(), Cycle.created_at.desc())
    )
    return list(result)


async def cycle_velocity(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> dict[str, object]:
    """Per-completed-cycle velocity from frozen final counts + a rolling average (COS-213)."""
    await _validate_project(session, ctx, project_id)
    completed = list(
        await session.scalars(
            select(Cycle)
            .where(
                Cycle.project_id == project_id,
                Cycle.org_id == ctx.org.id,
                Cycle.status == CycleStatus.COMPLETED,
            )
            .order_by(Cycle.completed_at.nullslast())
        )
    )
    cycles = [
        {
            "id": str(cycle.id),
            "name": cycle.name,
            "completed_at": cycle.completed_at.isoformat() if cycle.completed_at else None,
            "completed": cycle.final_completed_count or 0,
            "total": cycle.final_total_count or 0,
        }
        for cycle in completed
    ]
    velocities = [cycle.final_completed_count or 0 for cycle in completed]
    average = round(sum(velocities) / len(velocities), 2) if velocities else 0.0
    return {"cycles": cycles, "average_velocity": average, "cycle_count": len(cycles)}


def _empty_breakdown() -> dict[str, int]:
    return {"total": 0, "completed": 0, "started": 0, "todo": 0}


async def cycle_counts(
    session: AsyncSession, cycle_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, int]]:
    """Return per-cycle status breakdown: total (active), completed, started, todo.

    Cancelled/duplicate tasks are excluded from the active total. "todo" merges
    the backlog + unstarted categories so the build-up chart reads as
    todo → started → completed.
    """
    if not cycle_ids:
        return {}
    started_statuses = [
        status
        for status, category in STATUS_TO_CATEGORY.items()
        if category is StatusCategory.STARTED
    ]
    todo_statuses = [
        status
        for status, category in STATUS_TO_CATEGORY.items()
        if category in (StatusCategory.BACKLOG, StatusCategory.UNSTARTED)
    ]
    rows = await session.execute(
        select(
            Task.cycle_id,
            func.count().filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
            func.count().filter(Task.status == TaskStatus.DONE),
            func.count().filter(Task.status.in_(started_statuses)),
            func.count().filter(Task.status.in_(todo_statuses)),
        )
        .where(Task.cycle_id.in_(cycle_ids))
        .group_by(Task.cycle_id)
    )
    return {
        cid: {"total": total, "completed": completed, "started": started, "todo": todo}
        for cid, total, completed, started, todo in rows
        if cid is not None
    }


async def update_cycle(
    session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID, payload: CycleUpdateIn
) -> Cycle:
    """Apply updates to a cycle."""
    cycle = await get_cycle(session, ctx, cycle_id)
    _require_not_locked(cycle)
    if payload.name is not None:
        cycle.name = payload.name
    if payload.start_date is not None:
        cycle.start_date = payload.start_date
    if payload.end_date is not None:
        cycle.end_date = payload.end_date
    if payload.clear_milestone:
        cycle.milestone_id = None
    elif payload.milestone_id is not None:
        cycle.milestone_id = payload.milestone_id
    if cycle.start_date and cycle.end_date and cycle.end_date < cycle.start_date:
        raise BadRequestError("Cycle end date cannot precede its start date")
    await session.flush()
    return cycle


async def start_cycle(session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID) -> Cycle:
    """Mark a cycle active and stamp its start time.

    A project allows only one active cycle unless its ``parallel_cycles`` feature
    flag is set, in which case overlapping active cycles are permitted (COS-74).
    """
    cycle = await get_cycle(session, ctx, cycle_id)
    if cycle.status == CycleStatus.COMPLETED:
        raise BadRequestError("A completed cycle cannot be restarted")
    project = await session.get(Project, cycle.project_id)
    parallel = bool(project and project.features.get("parallel_cycles"))
    if not parallel:
        other_active = await session.scalar(
            select(Cycle.id).where(
                Cycle.project_id == cycle.project_id,
                Cycle.status == CycleStatus.ACTIVE,
                Cycle.id != cycle.id,
            )
        )
        if other_active is not None:
            raise BadRequestError(
                "Another cycle is already active. Complete it first, or enable parallel "
                "cycles for this project."
            )
    cycle.status = CycleStatus.ACTIVE
    cycle.started_at = utcnow()
    await session.flush()
    return cycle


async def complete_cycle(session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID) -> Cycle:
    """Mark a cycle completed, stamp completion, and freeze its final counts."""
    cycle = await get_cycle(session, ctx, cycle_id)
    total = (
        await session.scalar(
            select(func.count()).select_from(Task).where(Task.cycle_id == cycle.id)
        )
    ) or 0
    completed = (
        await session.scalar(
            select(func.count())
            .select_from(Task)
            .where(Task.cycle_id == cycle.id, Task.status.in_(_COMPLETED_STATUSES))
        )
    ) or 0
    cycle.status = CycleStatus.COMPLETED
    cycle.completed_at = utcnow()
    cycle.final_total_count = total
    cycle.final_completed_count = completed
    await session.flush()
    return cycle


async def delete_cycle(session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID) -> None:
    """Delete a cycle; assigned tasks are detached (cycle_id set null)."""
    cycle = await get_cycle(session, ctx, cycle_id)
    await session.delete(cycle)
    await session.flush()


async def _task_in_org(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    task = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def assign_task(
    session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Assign a task to a cycle (same project)."""
    cycle = await get_cycle(session, ctx, cycle_id)
    _require_not_locked(cycle)
    task = await _task_in_org(session, ctx, task_id)
    if task.project_id != cycle.project_id:
        raise BadRequestError("Task and cycle belong to different projects")
    task.cycle_id = cycle.id
    await session.flush()


async def unassign_task(
    session: AsyncSession, ctx: OrgContext, cycle_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Remove a task from a cycle."""
    cycle = await get_cycle(session, ctx, cycle_id)
    _require_not_locked(cycle)
    task = await _task_in_org(session, ctx, task_id)
    if task.cycle_id != cycle.id:
        raise NotFoundError("Task is not in this cycle")
    task.cycle_id = None
    await session.flush()


async def transfer_incomplete(
    session: AsyncSession,
    ctx: OrgContext,
    source_cycle_id: uuid.UUID,
    target_cycle_id: uuid.UUID,
) -> int:
    """Move incomplete tasks from one cycle to another in the same project."""
    source = await get_cycle(session, ctx, source_cycle_id)
    target = await get_cycle(session, ctx, target_cycle_id)
    _require_not_locked(target)
    if source.id == target.id:
        raise BadRequestError("Source and target cycles must differ")
    if source.project_id != target.project_id:
        raise BadRequestError("Cycles belong to different projects")
    predicate = (
        Task.cycle_id == source.id,
        Task.org_id == ctx.org.id,
        Task.status.in_(_INCOMPLETE_STATUSES),
    )
    moved = (await session.scalar(select(func.count()).select_from(Task).where(*predicate))) or 0
    await session.execute(update(Task).where(*predicate).values(cycle_id=target.id))
    await session.flush()
    return moved


async def list_team_cycles(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID
) -> list[tuple[Cycle, str, str]]:
    """Active + upcoming cycles across all of a team's linked projects (COS-95)."""
    rows = await session.execute(
        select(Cycle, Project.name, Project.key)
        .join(Project, Project.id == Cycle.project_id)
        .join(TeamProjectLink, TeamProjectLink.project_id == Cycle.project_id)
        .where(
            TeamProjectLink.team_id == team_id,
            Cycle.org_id == ctx.org.id,
            Cycle.status.in_([CycleStatus.ACTIVE, CycleStatus.UPCOMING]),
            Project.deleted_at.is_(None),
        )
        .order_by(Cycle.start_date.asc().nullslast(), Cycle.name)
    )
    return [(cycle, name, key) for cycle, name, key in rows]


async def list_active_cycles(
    session: AsyncSession, ctx: OrgContext
) -> list[tuple[Cycle, str, str]]:
    """List every active cycle across the org's projects, soonest end date first."""
    rows = await session.execute(
        select(Cycle, Project.name, Project.key)
        .join(Project, Project.id == Cycle.project_id)
        .where(
            Cycle.org_id == ctx.org.id,
            Cycle.status == CycleStatus.ACTIVE,
            Project.deleted_at.is_(None),
        )
        .order_by(Cycle.end_date.asc().nullslast(), Cycle.name)
    )
    return [(cycle, name, key) for cycle, name, key in rows]
