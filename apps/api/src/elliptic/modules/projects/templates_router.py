"""Project template endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.projects import templates_service as service
from elliptic.modules.projects.schemas import (
    InstantiateTemplateIn,
    ProjectOut,
    ProjectTemplateOut,
    SaveTemplateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/project-templates", tags=["project-templates"])


@router.get("")
async def list_templates(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ProjectTemplateOut]]:
    templates = await service.list_templates(session, ctx)
    return ok([ProjectTemplateOut.model_validate(template) for template in templates])


@router.post("/from-project/{project_id}", status_code=status.HTTP_201_CREATED)
async def save_as_template(
    project_id: uuid.UUID, payload: SaveTemplateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ProjectTemplateOut]:
    template = await service.save_as_template(
        session, ctx, project_id, payload.name, payload.description
    )
    return ok(ProjectTemplateOut.model_validate(template), message="Template saved")


@router.post("/{template_id}/instantiate", status_code=status.HTTP_201_CREATED)
async def instantiate_template(
    template_id: uuid.UUID, payload: InstantiateTemplateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ProjectOut]:
    project = await service.instantiate_template(
        session, ctx, template_id, name=payload.name, key=payload.key
    )
    return ok(ProjectOut.model_validate(project), message="Project created from template")


@router.delete("/{template_id}")
async def delete_template(
    template_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_template(session, ctx, template_id)
    return ok(None, message="Template deleted")
