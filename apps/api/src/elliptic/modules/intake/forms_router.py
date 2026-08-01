"""Custom intake form endpoints (COS-51)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.intake import forms_service as service
from elliptic.modules.intake.forms_schemas import (
    IntakeFormIn,
    IntakeFormOut,
    IntakeFormSubmitIn,
    IntakeFormUpdateIn,
    PublicIntakeFormOut,
)

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/intake-forms", tags=["intake"])
public_router = APIRouter(prefix="/intake-forms", tags=["public-intake"])


@router.get("")
async def list_forms(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[IntakeFormOut]]:
    forms = await service.list_forms(session, ctx, project_id)
    return ok([IntakeFormOut.model_validate(form) for form in forms])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_form(
    project_id: uuid.UUID, payload: IntakeFormIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[IntakeFormOut]:
    form = await service.create_form(
        session,
        ctx,
        project_id,
        name=payload.name,
        fields=[f.model_dump() for f in payload.fields],
    )
    return ok(IntakeFormOut.model_validate(form), message="Form created")


@router.patch("/{form_id}")
async def update_form(
    project_id: uuid.UUID,  # noqa: ARG001
    form_id: uuid.UUID,
    payload: IntakeFormUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[IntakeFormOut]:
    form = await service.update_form(
        session,
        ctx,
        form_id,
        name=payload.name,
        fields=[f.model_dump() for f in payload.fields] if payload.fields is not None else None,
        enabled=payload.enabled,
    )
    return ok(IntakeFormOut.model_validate(form), message="Form updated")


@router.delete("/{form_id}")
async def delete_form(
    project_id: uuid.UUID,  # noqa: ARG001
    form_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.delete_form(session, ctx, form_id)
    return ok(None, message="Form deleted")


@public_router.get("/{token}")
async def get_public_form(token: str, session: SessionDep) -> SuccessResponse[PublicIntakeFormOut]:
    form = await service.get_public_form(session, token)
    return ok(PublicIntakeFormOut.model_validate(form))


@public_router.post("/{token}", status_code=status.HTTP_201_CREATED)
async def submit_public_form(
    token: str, payload: IntakeFormSubmitIn, session: SessionDep
) -> SuccessResponse[dict[str, str]]:
    reference = await service.submit_public_form(session, token, payload.title, payload.answers)
    return ok({"reference": reference}, message="Submitted")
