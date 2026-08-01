"""Task approval endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.approvals import service
from elliptic.modules.approvals.schemas import (
    ApprovalDecisionIn,
    ApprovalOut,
    ApprovalRequestIn,
)

router = APIRouter(prefix="/orgs/{org_id}/tasks/{task_id}/approvals", tags=["approvals"])


@router.get("")
async def list_approvals(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ApprovalOut]]:
    approvals = await service.list_approvals(session, ctx, task_id)
    return ok([ApprovalOut.model_validate(a) for a in approvals])


@router.post("", status_code=status.HTTP_201_CREATED)
async def request_approval(
    task_id: uuid.UUID, payload: ApprovalRequestIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ApprovalOut]:
    approval = await service.request_approval(session, ctx, task_id, payload)
    return ok(ApprovalOut.model_validate(approval), message="Approval requested")


@router.post("/{approval_id}/approve")
async def approve(
    task_id: uuid.UUID,  # noqa: ARG001 — path scope
    approval_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    payload: ApprovalDecisionIn | None = None,
) -> SuccessResponse[ApprovalOut]:
    note = payload.note if payload is not None else None
    approval = await service.approve(session, ctx, approval_id, note)
    return ok(ApprovalOut.model_validate(approval), message="Approved")


@router.post("/{approval_id}/reject")
async def reject(
    task_id: uuid.UUID,  # noqa: ARG001 — path scope
    approval_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    payload: ApprovalDecisionIn | None = None,
) -> SuccessResponse[ApprovalOut]:
    note = payload.note if payload is not None else None
    approval = await service.reject(session, ctx, approval_id, note)
    return ok(ApprovalOut.model_validate(approval), message="Rejected")
