"""Favorites endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.favorites import service
from elliptic.modules.favorites.schemas import (
    FavoriteCreateIn,
    FavoriteOut,
    FavoriteReorderIn,
)

router = APIRouter(prefix="/orgs/{org_id}/favorites", tags=["favorites"])


@router.get("")
async def list_favorites(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[FavoriteOut]]:
    favorites = await service.list_favorites(session, ctx)
    return ok([FavoriteOut.model_validate(favorite) for favorite in favorites])


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    payload: FavoriteCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[FavoriteOut]:
    favorite = await service.add_favorite(session, ctx, payload)
    return ok(FavoriteOut.model_validate(favorite), message="Pinned")


@router.patch("/{favorite_id}")
async def reorder_favorite(
    favorite_id: uuid.UUID, payload: FavoriteReorderIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[FavoriteOut]:
    favorite = await service.reorder_favorite(session, ctx, favorite_id, payload.position)
    return ok(FavoriteOut.model_validate(favorite))


@router.delete("/{entity_type}/{entity_id}")
async def remove_favorite(
    entity_type: str, entity_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.remove_favorite(session, ctx, entity_type, entity_id)
    return ok(None, message="Unpinned")
