"""Worklog (time tracking) business logic."""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task
from elliptic.modules.users.models import User
from elliptic.modules.worklogs.models import Worklog, WorklogApprovalState
from elliptic.modules.worklogs.schemas import WorklogCreateIn


async def _get_task(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    task = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def create_worklog(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, payload: WorklogCreateIn
) -> Worklog:
    """Log time against a task; pending if the project requires approval (COS-185)."""
    task = await _get_task(session, ctx, task_id)
    requires_approval = await session.scalar(
        select(Project.worklog_approval_required).where(Project.id == task.project_id)
    )
    status = WorklogApprovalState.PENDING if requires_approval else WorklogApprovalState.APPROVED
    worklog = Worklog(
        org_id=ctx.org.id,
        project_id=task.project_id,
        task_id=task.id,
        user_id=ctx.user.id,
        minutes=payload.minutes,
        note=payload.note,
        logged_at=payload.logged_at or utcnow().date(),
        user_name=ctx.user.full_name,
        approval_status=status,
    )
    session.add(worklog)
    await session.flush()
    return worklog


async def list_pending_worklogs(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[Worklog]:
    """The approver queue: time entries awaiting approval in a project."""
    result = await session.scalars(
        select(Worklog)
        .where(
            Worklog.project_id == project_id,
            Worklog.org_id == ctx.org.id,
            Worklog.approval_status == WorklogApprovalState.PENDING,
        )
        .order_by(Worklog.logged_at.desc(), Worklog.created_at.desc())
    )
    return list(result)


async def decide_worklog(
    session: AsyncSession,
    ctx: OrgContext,
    worklog_id: uuid.UUID,
    *,
    approve: bool,
    note: str | None,
) -> Worklog:
    """Approve or reject a pending worklog (admin-gated at the router)."""
    worklog = await session.scalar(
        select(Worklog).where(Worklog.id == worklog_id, Worklog.org_id == ctx.org.id)
    )
    if worklog is None:
        raise NotFoundError("Worklog not found")
    worklog.approval_status = (
        WorklogApprovalState.APPROVED if approve else WorklogApprovalState.REJECTED
    )
    worklog.approver_id = ctx.user.id
    worklog.decided_at = utcnow()
    worklog.decision_note = note
    await session.flush()
    return worklog


async def list_worklogs(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> tuple[list[Worklog], int]:
    """List a task's worklogs (newest first) with the total minutes."""
    await _get_task(session, ctx, task_id)
    result = await session.scalars(
        select(Worklog)
        .where(Worklog.task_id == task_id, Worklog.org_id == ctx.org.id)
        .order_by(Worklog.logged_at.desc(), Worklog.created_at.desc())
    )
    entries = list(result)
    total = sum(entry.minutes for entry in entries)
    return entries, total


async def delete_worklog(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, worklog_id: uuid.UUID
) -> None:
    """Delete a worklog. Only the author may remove their own entry."""
    worklog = await session.scalar(
        select(Worklog).where(
            Worklog.id == worklog_id,
            Worklog.task_id == task_id,
            Worklog.org_id == ctx.org.id,
        )
    )
    if worklog is None:
        raise NotFoundError("Worklog not found")
    if worklog.user_id != ctx.user.id:
        raise NotFoundError("Worklog not found")
    await session.delete(worklog)
    await session.flush()


async def project_logged_minutes(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> int:
    """Total minutes logged across a project's tasks."""
    total = await session.scalar(
        select(func.coalesce(func.sum(Worklog.minutes), 0)).where(
            Worklog.project_id == project_id, Worklog.org_id == ctx.org.id
        )
    )
    return int(total or 0)


async def project_worklog_export_rows(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    *,
    start: date | None = None,
    end: date | None = None,
    user_id: uuid.UUID | None = None,
) -> list[dict[str, object]]:
    """Worklog rows for CSV export — joined with task identifier + logged-by name (COS-180)."""
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")
    where = [Worklog.project_id == project_id, Worklog.org_id == ctx.org.id]
    if start is not None:
        where.append(Worklog.logged_at >= start)
    if end is not None:
        where.append(Worklog.logged_at <= end)
    if user_id is not None:
        where.append(Worklog.user_id == user_id)
    rows = await session.execute(
        select(Worklog.logged_at, Task.number, User.full_name, Worklog.minutes, Worklog.note)
        .join(Task, Task.id == Worklog.task_id)
        .join(User, User.id == Worklog.user_id)
        .where(*where)
        .order_by(Worklog.logged_at.desc(), Task.number)
    )
    return [
        {
            "logged_at": logged_at.isoformat(),
            "task": f"{project.key}-{number}",
            "logged_by": full_name,
            "minutes": minutes,
            "note": note or "",
        }
        for logged_at, number, full_name, minutes, note in rows
    ]
