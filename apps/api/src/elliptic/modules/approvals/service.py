"""Task approval business logic — request, approve (applies the move), reject."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.approvals.models import ApprovalState, TaskApproval
from elliptic.modules.approvals.schemas import ApprovalRequestIn
from elliptic.modules.tasks import service as tasks_service
from elliptic.modules.tasks.models import Task


async def _get_task(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    task = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def request_approval(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, payload: ApprovalRequestIn
) -> TaskApproval:
    """Open a pending approval to move a task to a target status."""
    task = await _get_task(session, ctx, task_id)
    if task.status == payload.target_status:
        raise ConflictError("Task is already in the requested status")
    open_request = await session.scalar(
        select(TaskApproval.id).where(
            TaskApproval.task_id == task_id, TaskApproval.state == ApprovalState.PENDING
        )
    )
    if open_request is not None:
        raise ConflictError("This task already has a pending approval")
    approval = TaskApproval(
        org_id=ctx.org.id,
        task_id=task_id,
        target_status=payload.target_status,
        note=payload.note,
        requested_by=ctx.user.id,
    )
    session.add(approval)
    await session.flush()
    return approval


async def list_approvals(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[TaskApproval]:
    """List a task's approval requests, newest first."""
    await _get_task(session, ctx, task_id)
    result = await session.scalars(
        select(TaskApproval)
        .where(TaskApproval.task_id == task_id, TaskApproval.org_id == ctx.org.id)
        .order_by(TaskApproval.created_at.desc())
    )
    return list(result)


async def _get_pending(
    session: AsyncSession, ctx: OrgContext, approval_id: uuid.UUID
) -> TaskApproval:
    approval = await session.scalar(
        select(TaskApproval).where(
            TaskApproval.id == approval_id, TaskApproval.org_id == ctx.org.id
        )
    )
    if approval is None:
        raise NotFoundError("Approval not found")
    if approval.state is not ApprovalState.PENDING:
        raise ConflictError("This approval has already been decided")
    return approval


async def approve(
    session: AsyncSession, ctx: OrgContext, approval_id: uuid.UUID, note: str | None
) -> TaskApproval:
    """Approve a request and apply the status change."""
    approval = await _get_pending(session, ctx, approval_id)
    approval.state = ApprovalState.APPROVED
    approval.decided_by = ctx.user.id
    if note:
        approval.note = note
    await tasks_service.transition_status(session, ctx, approval.task_id, approval.target_status)
    await session.flush()
    return approval


async def reject(
    session: AsyncSession, ctx: OrgContext, approval_id: uuid.UUID, note: str | None
) -> TaskApproval:
    """Reject a request; the task stays where it is."""
    approval = await _get_pending(session, ctx, approval_id)
    approval.state = ApprovalState.REJECTED
    approval.decided_by = ctx.user.id
    if note:
        approval.note = note
    await session.flush()
    return approval
