"""Custom property endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.properties import service
from elliptic.modules.properties.schemas import (
    CustomPropertyCreateIn,
    CustomPropertyOut,
    PropertyTemplateOut,
)

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/properties", tags=["properties"])
templates_router = APIRouter(prefix="/orgs/{org_id}/property-templates", tags=["properties"])


@templates_router.get("")
async def list_templates(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[PropertyTemplateOut]]:
    templates = await service.list_templates(session, ctx)
    return ok([PropertyTemplateOut.model_validate(t) for t in templates])


@templates_router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: CustomPropertyCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PropertyTemplateOut]:
    template = await service.create_template(session, ctx, payload)
    return ok(PropertyTemplateOut.model_validate(template), message="Template created")


@templates_router.delete("/{template_id}")
async def delete_template(
    template_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_template(session, ctx, template_id)
    return ok(None, message="Template deleted")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_property(
    project_id: uuid.UUID, payload: CustomPropertyCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CustomPropertyOut]:
    prop = await service.create_property(session, ctx, project_id, payload)
    return ok(CustomPropertyOut.model_validate(prop), message="Property created")


@router.get("")
async def list_properties(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[CustomPropertyOut]]:
    props = await service.list_properties(session, ctx, project_id)
    return ok([CustomPropertyOut.model_validate(prop) for prop in props])


@router.post("/import/{template_id}", status_code=status.HTTP_201_CREATED)
async def import_template(
    project_id: uuid.UUID, template_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CustomPropertyOut]:
    prop = await service.import_template(session, ctx, project_id, template_id)
    return ok(CustomPropertyOut.model_validate(prop), message="Property imported")


@router.delete("/{property_id}")
async def delete_property(
    property_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_property(session, ctx, property_id)
    return ok(None, message="Property deleted")
