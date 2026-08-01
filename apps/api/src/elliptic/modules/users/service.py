"""User profile operations."""

import hashlib
import secrets
import uuid
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.users.models import PersonalAccessToken, User
from elliptic.modules.users.schemas import PersonalAccessTokenCreateIn, ProfileUpdateIn

PAT_PREFIX = "cos_pat_"


async def update_profile(session: AsyncSession, user: User, payload: ProfileUpdateIn) -> User:
    """Apply profile updates to the authenticated user."""
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.locale is not None:
        user.locale = payload.locale
    await session.flush()
    return user


def hash_pat(token: str) -> str:
    """Hash a personal access token for storage/lookup (high-entropy → sha256)."""
    return hashlib.sha256(token.encode()).hexdigest()


async def create_token(
    session: AsyncSession, user: User, payload: PersonalAccessTokenCreateIn
) -> tuple[PersonalAccessToken, str]:
    """Mint a personal access token, returning the row and the one-time plaintext."""
    raw = PAT_PREFIX + secrets.token_urlsafe(32)
    expires_at = (
        utcnow() + timedelta(days=payload.expires_in_days)
        if payload.expires_in_days is not None
        else None
    )
    token = PersonalAccessToken(
        user_id=user.id,
        name=payload.name,
        description=payload.description,
        prefix=raw[:16],
        token_hash=hash_pat(raw),
        expires_at=expires_at,
    )
    session.add(token)
    await session.flush()
    return token, raw


async def regenerate_token(
    session: AsyncSession, user: User, token_id: uuid.UUID
) -> tuple[PersonalAccessToken, str]:
    """Rotate a token's secret in place, keeping its name/description/expiry (COS-275)."""
    token = await session.scalar(
        select(PersonalAccessToken).where(
            PersonalAccessToken.id == token_id,
            PersonalAccessToken.user_id == user.id,
            PersonalAccessToken.revoked_at.is_(None),
        )
    )
    if token is None:
        raise NotFoundError("Token not found")
    raw = PAT_PREFIX + secrets.token_urlsafe(32)
    token.prefix = raw[:16]
    token.token_hash = hash_pat(raw)
    token.last_used_at = None
    await session.flush()
    return token, raw


async def list_tokens(session: AsyncSession, user: User) -> list[PersonalAccessToken]:
    """List a user's active (non-revoked) tokens."""
    result = await session.scalars(
        select(PersonalAccessToken)
        .where(
            PersonalAccessToken.user_id == user.id,
            PersonalAccessToken.revoked_at.is_(None),
        )
        .order_by(PersonalAccessToken.created_at.desc())
    )
    return list(result)


async def revoke_token(session: AsyncSession, user: User, token_id: uuid.UUID) -> None:
    """Revoke a user's personal access token."""
    token = await session.scalar(
        select(PersonalAccessToken).where(
            PersonalAccessToken.id == token_id, PersonalAccessToken.user_id == user.id
        )
    )
    if token is None:
        raise NotFoundError("Token not found")
    token.revoked_at = utcnow()
    await session.flush()


async def resolve_token_user(session: AsyncSession, raw_token: str) -> User | None:
    """Resolve the user behind a valid personal access token, or None."""
    token = await session.scalar(
        select(PersonalAccessToken).where(PersonalAccessToken.token_hash == hash_pat(raw_token))
    )
    if token is None or token.revoked_at is not None:
        return None
    if token.expires_at is not None and token.expires_at < utcnow():
        return None
    user = await session.get(User, token.user_id)
    if user is None or not user.is_active:
        return None
    token.last_used_at = utcnow()
    await session.flush()
    return user
