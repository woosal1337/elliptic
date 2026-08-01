"""Favorites business logic."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.favorites.models import Favorite
from elliptic.modules.favorites.schemas import FavoriteCreateIn


async def list_favorites(session: AsyncSession, ctx: OrgContext) -> list[Favorite]:
    """List the caller's favorites in this org, ordered by position then recency."""
    result = await session.scalars(
        select(Favorite)
        .where(Favorite.org_id == ctx.org.id, Favorite.user_id == ctx.user.id)
        .order_by(Favorite.position, Favorite.created_at.desc())
    )
    return list(result)


async def add_favorite(
    session: AsyncSession, ctx: OrgContext, payload: FavoriteCreateIn
) -> Favorite:
    """Pin an entity to the caller's favorites (idempotent on entity)."""
    existing = await session.scalar(
        select(Favorite).where(
            Favorite.user_id == ctx.user.id,
            Favorite.entity_type == payload.entity_type,
            Favorite.entity_id == payload.entity_id,
        )
    )
    if existing is not None:
        existing.label = payload.label
        await session.flush()
        return existing
    favorite = Favorite(
        org_id=ctx.org.id,
        user_id=ctx.user.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        label=payload.label,
    )
    session.add(favorite)
    await session.flush()
    return favorite


async def remove_favorite(
    session: AsyncSession, ctx: OrgContext, entity_type: str, entity_id: uuid.UUID
) -> None:
    """Unpin an entity from the caller's favorites."""
    favorite = await session.scalar(
        select(Favorite).where(
            Favorite.user_id == ctx.user.id,
            Favorite.entity_type == entity_type,
            Favorite.entity_id == entity_id,
        )
    )
    if favorite is None:
        raise NotFoundError("Favorite not found")
    await session.delete(favorite)
    await session.flush()


async def reorder_favorite(
    session: AsyncSession, ctx: OrgContext, favorite_id: uuid.UUID, position: float
) -> Favorite:
    """Set a favorite's sort position."""
    favorite = await session.scalar(
        select(Favorite).where(
            Favorite.id == favorite_id,
            Favorite.user_id == ctx.user.id,
            Favorite.org_id == ctx.org.id,
        )
    )
    if favorite is None:
        raise NotFoundError("Favorite not found")
    favorite.position = position
    await session.flush()
    return favorite
