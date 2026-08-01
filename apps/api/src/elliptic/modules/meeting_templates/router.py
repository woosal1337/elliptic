"""Custom meeting template endpoints under the AI surface."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.meeting_templates import service
from elliptic.modules.meeting_templates.schemas import (
    MeetingRecipeIn,
    MeetingRecipeOut,
    MeetingTemplateIn,
    MeetingTemplateOut,
    MeetingTemplateUpdateIn,
)
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/ai", tags=["meeting-templates"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("/meeting-templates")
async def list_templates(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[MeetingTemplateOut]]:
    templates = await service.list_templates(session, ctx)
    return ok([MeetingTemplateOut.model_validate(template) for template in templates])


@router.post("/meeting-templates", status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: MeetingTemplateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[MeetingTemplateOut]:
    template = await service.create_template(session, ctx, payload)
    return ok(MeetingTemplateOut.model_validate(template), message="Template created")


@router.patch("/meeting-templates/{template_id}")
async def update_template(
    template_id: uuid.UUID,
    payload: MeetingTemplateUpdateIn,
    ctx: AdminCtx,
    session: SessionDep,
) -> SuccessResponse[MeetingTemplateOut]:
    template = await service.update_template(session, ctx, template_id, payload)
    return ok(MeetingTemplateOut.model_validate(template), message="Template updated")


@router.delete("/meeting-templates/{template_id}")
async def delete_template(
    template_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_template(session, ctx, template_id)
    return ok(None, message="Template deleted")


@router.get("/meeting-recipes")
async def list_recipes(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[MeetingRecipeOut]]:
    recipes = await service.list_recipes(session, ctx)
    return ok([MeetingRecipeOut.model_validate(recipe) for recipe in recipes])


@router.post("/meeting-recipes", status_code=status.HTTP_201_CREATED)
async def create_recipe(
    payload: MeetingRecipeIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingRecipeOut]:
    recipe = await service.create_recipe(session, ctx, payload)
    return ok(MeetingRecipeOut.model_validate(recipe), message="Recipe saved")
