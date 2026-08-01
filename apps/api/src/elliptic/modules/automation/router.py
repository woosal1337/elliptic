"""Automation rule endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.automation import service
from elliptic.modules.automation.schemas import (
    AutomationRuleIn,
    AutomationRuleOut,
    AutomationRuleUpdateIn,
    SkillRunIn,
    SkillRunOut,
)
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/automations", tags=["automations"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("")
async def list_rules(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[AutomationRuleOut]]:
    rules = await service.list_rules(session, ctx)
    return ok([AutomationRuleOut.model_validate(rule) for rule in rules])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rule(
    payload: AutomationRuleIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AutomationRuleOut]:
    rule = await service.create_rule(session, ctx, payload)
    return ok(AutomationRuleOut.model_validate(rule), message="Automation saved")


@router.patch("/{rule_id}")
async def update_rule(
    rule_id: uuid.UUID, payload: AutomationRuleUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AutomationRuleOut]:
    rule = await service.update_rule(session, ctx, rule_id, payload)
    return ok(AutomationRuleOut.model_validate(rule))


@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_rule(session, ctx, rule_id)
    return ok(None, message="Automation removed")


@router.post("/{rule_id}/run")
async def run_skill(
    rule_id: uuid.UUID, payload: SkillRunIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SkillRunOut]:
    ran = await service.run_skill(session, ctx, rule_id, payload.task_id)
    return ok(SkillRunOut(ok=ran), message="Skill applied")
