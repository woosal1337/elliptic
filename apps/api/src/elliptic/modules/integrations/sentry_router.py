"""Sentry intake endpoints (COS-260)."""

import uuid
from typing import Any

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.integrations import sentry_service as service
from elliptic.modules.integrations.schemas import SentryIntakeOut

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/sentry", tags=["integrations"])
public_router = APIRouter(prefix="/integrations/sentry", tags=["public-integrations"])


@router.get("")
async def list_intakes(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[SentryIntakeOut]]:
    rows = await service.list_intakes(session, ctx, project_id)
    return ok([SentryIntakeOut.model_validate(r) for r in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_intake(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SentryIntakeOut]:
    intake = await service.create_intake(session, ctx, project_id)
    return ok(SentryIntakeOut.model_validate(intake), message="Sentry intake created")


@router.delete("/{intake_id}")
async def delete_intake(
    project_id: uuid.UUID,  # noqa: ARG001
    intake_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.delete_intake(session, ctx, intake_id)
    return ok(None, message="Sentry intake deleted")


@public_router.post("/{token}", status_code=status.HTTP_201_CREATED)
async def ingest(
    token: str, payload: dict[str, Any], session: SessionDep
) -> SuccessResponse[dict[str, str]]:
    reference = await service.ingest(session, token, payload)
    return ok({"reference": reference}, message="Alert ingested")
