"""Confidential third-party OAuth apps (bot tokens via client_credentials) — COS-198."""

import hashlib
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.mcp_auth.models import ClientRegistrationType, OAuthClient
from elliptic.modules.users.models import User
from elliptic.modules.users.schemas import PersonalAccessTokenCreateIn
from elliptic.modules.users.service import create_token


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


async def create_app(session: AsyncSession, owner: User, name: str) -> tuple[OAuthClient, str]:
    """Register a confidential client_credentials app; returns (client, plaintext secret)."""
    secret = "cos_secret_" + secrets.token_urlsafe(32)
    client = OAuthClient(
        client_id=f"app-{uuid.uuid4().hex}",
        registration_type=ClientRegistrationType.PREREGISTERED,
        client_name=name,
        redirect_uris=[],
        grant_types=["client_credentials"],
        token_endpoint_auth_method="client_secret_post",  # noqa: S106
        owner_user_id=owner.id,
        client_secret_hash=_hash_secret(secret),
    )
    session.add(client)
    await session.flush()
    return client, secret


async def list_apps(session: AsyncSession, owner: User) -> list[OAuthClient]:
    result = await session.scalars(
        select(OAuthClient)
        .where(OAuthClient.owner_user_id == owner.id, OAuthClient.is_active.is_(True))
        .order_by(OAuthClient.created_at.desc())
    )
    return list(result)


async def revoke_app(session: AsyncSession, owner: User, client_id: str) -> None:
    app = await session.scalar(
        select(OAuthClient).where(
            OAuthClient.client_id == client_id, OAuthClient.owner_user_id == owner.id
        )
    )
    if app is None:
        raise NotFoundError("App not found")
    app.is_active = False
    await session.flush()


async def client_credentials_token(
    session: AsyncSession, client_id: str, client_secret: str
) -> str:
    """Validate an app's credentials and mint a bot PAT acting as the app owner."""
    app = await session.scalar(
        select(OAuthClient).where(
            OAuthClient.client_id == client_id, OAuthClient.is_active.is_(True)
        )
    )
    if (
        app is None
        or app.owner_user_id is None
        or app.client_secret_hash != _hash_secret(client_secret)
    ):
        raise BadRequestError("invalid_client")
    owner = await session.get(User, app.owner_user_id)
    if owner is None or not owner.is_active:
        raise BadRequestError("invalid_client")
    _, raw = await create_token(
        session, owner, PersonalAccessTokenCreateIn(name=f"bot:{app.client_name}")
    )
    return raw
