"""Milestone business logic."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.cycles.models import Cycle
from elliptic.modules.milestones.models import Milestone
from elliptic.modules.milestones.schemas import MilestoneCreateIn, MilestoneUpdateIn
from elliptic.modules.modules.models import Module
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import PROGRESS_EXCLUDED_STATUSES, Task, TaskStatus


async def _validate_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    row = await session.scalar(
        select(Project.id).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if row is None:
        raise NotFoundError("Project not found")


async def get_milestone(
    session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID
) -> Milestone:
    milestone = await session.scalar(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.org_id == ctx.org.id)
    )
    if milestone is None:
        raise NotFoundError("Milestone not found")
    return milestone


async def create_milestone(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: MilestoneCreateIn
) -> Milestone:
    """Create a milestone in a project."""
    await _validate_project(session, ctx, project_id)
    milestone = Milestone(
        org_id=ctx.org.id,
        project_id=project_id,
        name=payload.name,
        description=payload.description,
        target_date=payload.target_date,
    )
    session.add(milestone)
    await session.flush()
    return milestone


async def list_milestones(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[Milestone]:
    """List a project's milestones by target date."""
    await _validate_project(session, ctx, project_id)
    result = await session.scalars(
        select(Milestone)
        .where(Milestone.project_id == project_id, Milestone.org_id == ctx.org.id)
        .order_by(Milestone.target_date.asc().nullslast(), Milestone.created_at.desc())
    )
    return list(result)


async def milestone_counts(
    session: AsyncSession, milestone_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, int]]:
    """Return per-milestone {total, done} across directly-linked items plus items in
    cycles or modules grouped under the milestone (COS-128), counting each task once."""
    if not milestone_ids:
        return {}
    counts: dict[uuid.UUID, dict[str, int]] = {}
    for milestone_id in milestone_ids:
        row = (
            await session.execute(
                select(
                    func.count(func.distinct(Task.id)).filter(
                        Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)
                    ),
                    func.count(func.distinct(Task.id)).filter(Task.status == TaskStatus.DONE),
                )
                .select_from(Task)
                .outerjoin(Cycle, Task.cycle_id == Cycle.id)
                .outerjoin(Module, Task.module_id == Module.id)
                .where(
                    or_(
                        Task.milestone_id == milestone_id,
                        Cycle.milestone_id == milestone_id,
                        Module.milestone_id == milestone_id,
                    )
                )
            )
        ).one()
        counts[milestone_id] = {"total": row[0] or 0, "done": row[1] or 0}
    return counts


async def update_milestone(
    session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID, payload: MilestoneUpdateIn
) -> Milestone:
    """Apply updates to a milestone."""
    milestone = await get_milestone(session, ctx, milestone_id)
    if payload.name is not None:
        milestone.name = payload.name
    if payload.description is not None:
        milestone.description = payload.description or None
    if payload.target_date is not None:
        milestone.target_date = payload.target_date
    if payload.status is not None:
        milestone.status = payload.status
    await session.flush()
    return milestone


async def delete_milestone(session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID) -> None:
    """Delete a milestone; linked tasks are detached (milestone_id set null)."""
    milestone = await get_milestone(session, ctx, milestone_id)
    await session.delete(milestone)
    await session.flush()


async def _task_in_org(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    task = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def assign_task(
    session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Link a task to a milestone (same project)."""
    milestone = await get_milestone(session, ctx, milestone_id)
    task = await _task_in_org(session, ctx, task_id)
    if task.project_id != milestone.project_id:
        raise BadRequestError("Task and milestone belong to different projects")
    task.milestone_id = milestone.id
    await session.flush()


async def unassign_task(
    session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Unlink a task from a milestone."""
    await get_milestone(session, ctx, milestone_id)
    task = await _task_in_org(session, ctx, task_id)
    if task.milestone_id == milestone_id:
        task.milestone_id = None
        await session.flush()


async def assign_tasks_bulk(
    session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID, task_ids: list[uuid.UUID]
) -> list[dict[str, object]]:
    """Link many tasks to a milestone at once; per-target linked / skipped."""
    milestone = await get_milestone(session, ctx, milestone_id)
    results: list[dict[str, object]] = []
    seen: set[uuid.UUID] = set()
    for task_id in task_ids:
        if task_id in seen:
            results.append({"task_id": task_id, "status": "skipped"})
            continue
        seen.add(task_id)
        task = await session.scalar(
            select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id)
        )
        if task is None or task.project_id != milestone.project_id:
            results.append({"task_id": task_id, "status": "skipped"})
            continue
        task.milestone_id = milestone.id
        results.append({"task_id": task_id, "status": "linked"})
    await session.flush()
    return results


async def list_milestone_tasks(
    session: AsyncSession, ctx: OrgContext, milestone_id: uuid.UUID
) -> tuple[list[Task], str]:
    """List the work items linked to a milestone, with the project key."""
    milestone = await get_milestone(session, ctx, milestone_id)
    project_key = await session.scalar(
        select(Project.key).where(Project.id == milestone.project_id)
    )
    result = await session.scalars(
        select(Task)
        .where(Task.milestone_id == milestone_id, Task.org_id == ctx.org.id)
        .order_by(Task.status, Task.created_at.desc())
    )
    return list(result), project_key or ""
