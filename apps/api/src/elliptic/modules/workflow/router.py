"""Workflow status endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.workflow import service
from elliptic.modules.workflow.schemas import (
    TransitionConditionIn,
    TransitionConditionOut,
    WorkflowStatusIn,
    WorkflowStatusOut,
    WorkflowStatusUpdateIn,
    WorkflowTransitionIn,
    WorkflowTransitionOut,
)

router = APIRouter(prefix="/orgs/{org_id}", tags=["workflow"])


@router.get("/workflow/statuses")
async def list_statuses(
    ctx: OrgCtx,
    session: SessionDep,
    team_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[list[WorkflowStatusOut]]:
    statuses = await service.list_statuses(session, ctx, team_id)
    return ok([WorkflowStatusOut.model_validate(item) for item in statuses])


@router.post("/workflow/statuses", status_code=status.HTTP_201_CREATED)
async def create_status(
    payload: WorkflowStatusIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorkflowStatusOut]:
    created = await service.create_status(session, ctx, payload)
    return ok(WorkflowStatusOut.model_validate(created), message="Status added")


@router.patch("/workflow/statuses/{status_id}")
async def update_status(
    status_id: uuid.UUID,
    payload: WorkflowStatusUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[WorkflowStatusOut]:
    updated = await service.update_status(session, ctx, status_id, payload)
    return ok(WorkflowStatusOut.model_validate(updated))


@router.delete("/workflow/statuses/{status_id}")
async def delete_status(
    status_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    transfer_to: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[None]:
    await service.delete_status(session, ctx, status_id, transfer_to)
    return ok(None, message="Status removed")


@router.get("/workflow/statuses/{status_id}/item-count")
async def status_item_count(
    status_id: uuid.UUID,
    ctx: OrgCtx,  # noqa: ARG001 — auth scope only
    session: SessionDep,
) -> SuccessResponse[dict[str, int]]:
    count = await service.status_item_count(session, status_id)
    return ok({"count": count})


@router.get("/workflow/transitions")
async def list_transitions(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[WorkflowTransitionOut]]:
    transitions = await service.list_transitions(session, ctx)
    return ok([WorkflowTransitionOut.model_validate(item) for item in transitions])


@router.post("/workflow/transitions", status_code=status.HTTP_201_CREATED)
async def create_transition(
    payload: WorkflowTransitionIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorkflowTransitionOut]:
    created = await service.create_transition(
        session,
        ctx,
        payload.from_status_id,
        payload.to_status_id,
        payload.required_role,
        kind=payload.kind,
    )
    return ok(WorkflowTransitionOut.model_validate(created), message="Transition allowed")


@router.delete("/workflow/transitions/{transition_id}")
async def delete_transition(
    transition_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_transition(session, ctx, transition_id)
    return ok(None, message="Transition removed")


@router.get("/workflow/conditions")
async def list_conditions(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TransitionConditionOut]]:
    rows = await service.list_conditions(session, ctx)
    return ok([TransitionConditionOut.model_validate(row) for row in rows])


@router.post("/workflow/conditions", status_code=status.HTTP_201_CREATED)
async def create_condition(
    payload: TransitionConditionIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TransitionConditionOut]:
    row = await service.create_condition(
        session,
        ctx,
        from_status_id=payload.from_status_id,
        to_status_id=payload.to_status_id,
        condition=payload.condition,
    )
    return ok(TransitionConditionOut.model_validate(row), message="Condition added")


@router.delete("/workflow/conditions/{condition_id}")
async def delete_condition(
    condition_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_condition(session, ctx, condition_id)
    return ok(None, message="Condition removed")
