"""Recurring work item endpoints (COS-143)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.recurring import service
from elliptic.modules.recurring.schemas import (
    RecurringTaskCreateIn,
    RecurringTaskOut,
    RecurringTaskUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}", tags=["recurring"])


@router.get("/projects/{project_id}/recurring-tasks")
async def list_rules(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[RecurringTaskOut]]:
    rules = await service.list_rules(session, ctx, project_id)
    return ok([RecurringTaskOut.model_validate(rule) for rule in rules])


@router.post("/projects/{project_id}/recurring-tasks", status_code=status.HTTP_201_CREATED)
async def create_rule(
    project_id: uuid.UUID, payload: RecurringTaskCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RecurringTaskOut]:
    rule = await service.create_rule(session, ctx, project_id, payload)
    return ok(RecurringTaskOut.model_validate(rule), message="Recurring rule created")


@router.patch("/recurring-tasks/{rule_id}")
async def update_rule(
    rule_id: uuid.UUID, payload: RecurringTaskUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RecurringTaskOut]:
    rule = await service.update_rule(session, ctx, rule_id, payload)
    return ok(RecurringTaskOut.model_validate(rule), message="Recurring rule updated")


@router.delete("/recurring-tasks/{rule_id}")
async def delete_rule(
    rule_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_rule(session, ctx, rule_id)
    return ok(None, message="Recurring rule deleted")


@router.post("/recurring-tasks/{rule_id}/run", status_code=status.HTTP_201_CREATED)
async def run_rule(
    rule_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[dict[str, str]]:
    task = await service.run_rule_now(session, ctx, rule_id)
    return ok({"task_id": str(task.id)}, message="Work item created")
