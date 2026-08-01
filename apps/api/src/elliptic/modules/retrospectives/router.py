"""Retrospective endpoints (COS-267)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.retrospectives import service
from elliptic.modules.retrospectives.schemas import (
    RetrospectiveCreateIn,
    RetrospectiveOut,
    RetrospectiveUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}", tags=["retrospectives"])


@router.get("/projects/{project_id}/retrospectives")
async def list_retros(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[RetrospectiveOut]]:
    retros = await service.list_retros(session, ctx, project_id)
    return ok([RetrospectiveOut.model_validate(r) for r in retros])


@router.post("/projects/{project_id}/retrospectives", status_code=status.HTTP_201_CREATED)
async def create_retro(
    project_id: uuid.UUID, payload: RetrospectiveCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RetrospectiveOut]:
    retro = await service.create_retro(session, ctx, project_id, payload)
    return ok(RetrospectiveOut.model_validate(retro), message="Retrospective created")


@router.patch("/retrospectives/{retro_id}")
async def update_retro(
    retro_id: uuid.UUID, payload: RetrospectiveUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RetrospectiveOut]:
    retro = await service.update_retro(session, ctx, retro_id, payload)
    return ok(RetrospectiveOut.model_validate(retro), message="Retrospective updated")


@router.delete("/retrospectives/{retro_id}")
async def delete_retro(
    retro_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_retro(session, ctx, retro_id)
    return ok(None, message="Retrospective deleted")
