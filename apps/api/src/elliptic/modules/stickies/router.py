"""Sticky endpoints (per-user scratchpad)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.stickies import service
from elliptic.modules.stickies.schemas import (
    StickyConvertIn,
    StickyConvertOut,
    StickyCreateIn,
    StickyOut,
    StickyUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/stickies", tags=["stickies"])


@router.get("")
async def list_stickies(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[StickyOut]]:
    stickies = await service.list_stickies(session, ctx)
    return ok([StickyOut.model_validate(sticky) for sticky in stickies])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_sticky(
    payload: StickyCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[StickyOut]:
    sticky = await service.create_sticky(session, ctx, payload)
    return ok(StickyOut.model_validate(sticky), message="Sticky created")


@router.patch("/{sticky_id}")
async def update_sticky(
    sticky_id: uuid.UUID, payload: StickyUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[StickyOut]:
    sticky = await service.update_sticky(session, ctx, sticky_id, payload)
    return ok(StickyOut.model_validate(sticky))


@router.delete("/{sticky_id}")
async def delete_sticky(
    sticky_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_sticky(session, ctx, sticky_id)
    return ok(None, message="Sticky deleted")


@router.post("/{sticky_id}/convert", status_code=status.HTTP_201_CREATED)
async def convert_sticky(
    sticky_id: uuid.UUID, payload: StickyConvertIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[StickyConvertOut]:
    """Turn a sticky into a task or note (COS-162)."""
    result = await service.convert_sticky(
        session,
        ctx,
        sticky_id,
        target=payload.target,
        project_id=payload.project_id,
        delete_after=payload.delete_after,
    )
    return ok(StickyConvertOut.model_validate(result), message=f"Converted to {payload.target}")
