"""Register (RAID / decisions / risks) endpoints (COS-261)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.register import service
from elliptic.modules.register.models import RegisterKind
from elliptic.modules.register.schemas import (
    RegisterEntryIn,
    RegisterEntryOut,
    RegisterEntryUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/register", tags=["register"])


@router.get("")
async def list_entries(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    kind: Annotated[RegisterKind | None, Query()] = None,
) -> SuccessResponse[list[RegisterEntryOut]]:
    entries = await service.list_entries(session, ctx, project_id, kind=kind)
    return ok([RegisterEntryOut.model_validate(entry) for entry in entries])


@router.post("")
async def create_entry(
    project_id: uuid.UUID, payload: RegisterEntryIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RegisterEntryOut]:
    entry = await service.create_entry(session, ctx, project_id, payload)
    return ok(RegisterEntryOut.model_validate(entry), message="Entry added")


@router.patch("/{entry_id}")
async def update_entry(
    project_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: RegisterEntryUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[RegisterEntryOut]:
    entry = await service.update_entry(session, ctx, project_id, entry_id, payload)
    return ok(RegisterEntryOut.model_validate(entry), message="Entry updated")


@router.delete("/{entry_id}")
async def delete_entry(
    project_id: uuid.UUID, entry_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_entry(session, ctx, project_id, entry_id)
    return ok(None, message="Entry deleted")
