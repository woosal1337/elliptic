"""Module (workstream) business logic."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.modules.models import Module, ModuleStatus
from elliptic.modules.modules.schemas import ModuleCreateIn, ModuleUpdateIn
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import (
    PROGRESS_EXCLUDED_STATUSES,
    STATUS_TO_CATEGORY,
    StatusCategory,
    Task,
    TaskStatus,
)

_STARTED_STATUSES = [s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.STARTED]
_TODO_STATUSES = [
    s
    for s, c in STATUS_TO_CATEGORY.items()
    if c in (StatusCategory.BACKLOG, StatusCategory.UNSTARTED)
]


async def _validate_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    row = await session.scalar(
        select(Project.id).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if row is None:
        raise NotFoundError("Project not found")


async def get_module(session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID) -> Module:
    module = await session.scalar(
        select(Module).where(Module.id == module_id, Module.org_id == ctx.org.id)
    )
    if module is None:
        raise NotFoundError("Module not found")
    return module


async def create_module(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: ModuleCreateIn
) -> Module:
    """Create a module (workstream) in a project."""
    await _validate_project(session, ctx, project_id)
    module = Module(
        org_id=ctx.org.id,
        project_id=project_id,
        name=payload.name,
        description=payload.description,
        lead_id=payload.lead_id,
        start_date=payload.start_date,
        target_date=payload.target_date,
    )
    session.add(module)
    await session.flush()
    return module


async def list_modules(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    *,
    include_archived: bool = False,
) -> list[Module]:
    """List a project's modules, newest first (archived excluded by default)."""
    await _validate_project(session, ctx, project_id)
    where = [Module.project_id == project_id, Module.org_id == ctx.org.id]
    if not include_archived:
        where.append(Module.archived_at.is_(None))
    result = await session.scalars(select(Module).where(*where).order_by(Module.created_at.desc()))
    return list(result)


async def set_module_archived(
    session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID, archived: bool
) -> Module:
    """Archive or restore a module (archived modules are hidden by default)."""
    module = await get_module(session, ctx, module_id)
    module.archived_at = utcnow() if archived else None
    await session.flush()
    return module


async def module_export_rows(
    session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID
) -> tuple[Module, list[Task]]:
    """A module and its linked work items, for CSV export."""
    module = await get_module(session, ctx, module_id)
    tasks = list(
        await session.scalars(
            select(Task)
            .where(Task.module_id == module.id, Task.org_id == ctx.org.id)
            .order_by(Task.number)
        )
    )
    return module, tasks


async def module_counts(
    session: AsyncSession, module_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, int]]:
    """Return per-module {total, done, started, todo} from linked work items."""
    if not module_ids:
        return {}
    rows = await session.execute(
        select(
            Task.module_id,
            func.count().filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
            func.count().filter(Task.status == TaskStatus.DONE),
            func.count().filter(Task.status.in_(_STARTED_STATUSES)),
            func.count().filter(Task.status.in_(_TODO_STATUSES)),
        )
        .where(Task.module_id.in_(module_ids))
        .group_by(Task.module_id)
    )
    return {
        mid: {"total": total, "done": done, "started": started, "todo": todo}
        for mid, total, done, started, todo in rows
        if mid is not None
    }


async def update_module(
    session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID, payload: ModuleUpdateIn
) -> Module:
    """Apply updates to a module."""
    module = await get_module(session, ctx, module_id)
    if payload.name is not None:
        module.name = payload.name
    if payload.description is not None:
        module.description = payload.description or None
    if payload.clear_lead:
        module.lead_id = None
    elif payload.lead_id is not None:
        module.lead_id = payload.lead_id
    if payload.start_date is not None:
        module.start_date = payload.start_date
    if payload.target_date is not None:
        module.target_date = payload.target_date
    if payload.status is not None:
        module.status = payload.status
    if payload.clear_milestone:
        module.milestone_id = None
    elif payload.milestone_id is not None:
        module.milestone_id = payload.milestone_id
    await session.flush()
    return module


async def delete_module(session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID) -> None:
    """Delete a module; linked tasks are detached (module_id set null)."""
    module = await get_module(session, ctx, module_id)
    await session.delete(module)
    await session.flush()


async def _task_in_org(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    task = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def assign_task(
    session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Link a task to a module (same project)."""
    module = await get_module(session, ctx, module_id)
    task = await _task_in_org(session, ctx, task_id)
    if task.project_id != module.project_id:
        raise BadRequestError("Task and module belong to different projects")
    task.module_id = module.id
    await session.flush()


async def unassign_task(
    session: AsyncSession, ctx: OrgContext, module_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Unlink a task from a module."""
    await get_module(session, ctx, module_id)
    task = await _task_in_org(session, ctx, task_id)
    if task.module_id == module_id:
        task.module_id = None
        await session.flush()


async def modules_summary(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> dict[str, int]:
    """Project-level module analytics: counts by status, task totals, and delayed count."""
    await _validate_project(session, ctx, project_id)
    modules = await session.scalars(
        select(Module).where(Module.project_id == project_id, Module.org_id == ctx.org.id)
    )
    today = utcnow().date()
    open_statuses = {ModuleStatus.PLANNED, ModuleStatus.IN_PROGRESS, ModuleStatus.PAUSED}
    summary = {
        "module_count": 0,
        "completed": 0,
        "in_progress": 0,
        "delayed": 0,
    }
    module_ids: list[uuid.UUID] = []
    for module in modules:
        module_ids.append(module.id)
        summary["module_count"] += 1
        if module.status is ModuleStatus.COMPLETED:
            summary["completed"] += 1
        elif module.status is ModuleStatus.IN_PROGRESS:
            summary["in_progress"] += 1
        if (
            module.target_date is not None
            and module.target_date < today
            and module.status in open_statuses
        ):
            summary["delayed"] += 1

    counts = await module_counts(session, module_ids)
    summary["task_total"] = sum(c["total"] for c in counts.values())
    summary["task_done"] = sum(c["done"] for c in counts.values())
    return summary
