"""OIDC SSO: connection config + authorization/callback flow (COS-170)."""

import secrets
import uuid
from typing import Any

import httpx
import jwt
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import (
    BadRequestError,
    ConflictError,
    NotFoundError,
    UnauthorizedError,
)
from elliptic.core.security import hash_password
from elliptic.modules.orgs.models import OrganizationMember, OrgRole
from elliptic.modules.sso.models import SSOConnection
from elliptic.modules.users.models import User

_STATE_TTL = 600
_AAD = b"sso-client-secret"


async def fetch_discovery(issuer: str) -> dict[str, Any]:
    url = f"{issuer.rstrip('/')}/.well-known/openid-configuration"
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.get(url)
        resp.raise_for_status()
        return dict(resp.json())


async def exchange_code(
    token_endpoint: str, *, code: str, client_id: str, client_secret: str, redirect_uri: str
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.post(
            token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            },
        )
        resp.raise_for_status()
        return dict(resp.json())


async def fetch_userinfo(userinfo_endpoint: str, access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.get(
            userinfo_endpoint, headers={"Authorization": f"Bearer {access_token}"}
        )
        resp.raise_for_status()
        return dict(resp.json())


async def get_connection(session: AsyncSession, ctx: OrgContext) -> SSOConnection | None:
    connection: SSOConnection | None = await session.scalar(
        select(SSOConnection).where(SSOConnection.org_id == ctx.org.id)
    )
    return connection


async def upsert_connection(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    domain: str,
    issuer: str,
    client_id: str,
    client_secret: str | None,
    redirect_uri: str,
    enabled: bool,
) -> SSOConnection:
    existing = await session.scalar(select(SSOConnection).where(SSOConnection.domain == domain))
    if existing is not None and existing.org_id != ctx.org.id:
        raise ConflictError("This domain is already connected to another organization")
    connection = await get_connection(session, ctx)
    if connection is None:
        if client_secret is None:
            raise BadRequestError("A client secret is required when configuring SSO")
        nonce, ciphertext = encrypt_secret(client_secret, get_settings().kek_bytes, _AAD)
        connection = SSOConnection(
            org_id=ctx.org.id,
            domain=domain,
            issuer=issuer,
            client_id=client_id,
            encrypted_secret=ciphertext,
            nonce=nonce,
            redirect_uri=redirect_uri,
            enabled=enabled,
        )
        session.add(connection)
    else:
        connection.domain = domain
        connection.issuer = issuer
        connection.client_id = client_id
        connection.redirect_uri = redirect_uri
        connection.enabled = enabled
        if client_secret:
            nonce, ciphertext = encrypt_secret(client_secret, get_settings().kek_bytes, _AAD)
            connection.encrypted_secret = ciphertext
            connection.nonce = nonce
    await session.flush()
    return connection


async def delete_connection(session: AsyncSession, ctx: OrgContext) -> None:
    connection = await get_connection(session, ctx)
    if connection is not None:
        await session.delete(connection)
        await session.flush()


def _sign_state(connection_id: uuid.UUID) -> str:
    import time  # noqa: PLC0415

    payload = {"cid": str(connection_id), "exp": int(time.time()) + _STATE_TTL}
    return jwt.encode(payload, get_settings().jwt_secret_key, algorithm="HS256")


def _verify_state(state: str) -> uuid.UUID:
    try:
        payload = jwt.decode(state, get_settings().jwt_secret_key, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired SSO state") from exc
    return uuid.UUID(str(payload["cid"]))


async def authorization_url(session: AsyncSession, domain: str) -> str:
    connection = await session.scalar(
        select(SSOConnection).where(
            SSOConnection.domain == domain.lower(), SSOConnection.enabled.is_(True)
        )
    )
    if connection is None:
        raise NotFoundError("No SSO is configured for that domain")
    discovery = await fetch_discovery(connection.issuer)
    auth_endpoint = str(discovery["authorization_endpoint"])
    params = {
        "response_type": "code",
        "client_id": connection.client_id,
        "redirect_uri": connection.redirect_uri,
        "scope": "openid email profile",
        "state": _sign_state(connection.id),
    }
    from urllib.parse import urlencode  # noqa: PLC0415

    return f"{auth_endpoint}?{urlencode(params)}"


async def complete_login(session: AsyncSession, code: str, state: str) -> User:
    connection_id = _verify_state(state)
    connection = await session.get(SSOConnection, connection_id)
    if connection is None or not connection.enabled:
        raise UnauthorizedError("SSO connection not found")

    discovery = await fetch_discovery(connection.issuer)
    secret = decrypt_secret(
        connection.nonce, connection.encrypted_secret, get_settings().kek_bytes, _AAD
    )
    tokens = await exchange_code(
        str(discovery["token_endpoint"]),
        code=code,
        client_id=connection.client_id,
        client_secret=secret,
        redirect_uri=connection.redirect_uri,
    )
    userinfo = await fetch_userinfo(
        str(discovery["userinfo_endpoint"]), str(tokens["access_token"])
    )
    email = str(userinfo.get("email", "")).strip().lower()
    if not email:
        raise UnauthorizedError("The identity provider did not return an email")
    if email.split("@")[-1] != connection.domain.lower():
        raise UnauthorizedError("Email domain does not match the SSO connection")

    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            full_name=str(userinfo.get("name") or email.split("@")[0]),
            email_verified=True,
        )
        session.add(user)
        await session.flush()
    membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == connection.org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    if membership is None:
        session.add(
            OrganizationMember(org_id=connection.org_id, user_id=user.id, role=OrgRole.MEMBER)
        )
        await session.flush()

    if connection.sync_on_login:
        raw_groups = userinfo.get(connection.group_attribute_key)
        groups = [str(g) for g in raw_groups] if isinstance(raw_groups, list) else []
        try:
            from elliptic.modules.idp_sync.service import reconcile  # noqa: PLC0415

            await reconcile(
                session,
                connection.org_id,
                user.id,
                groups,
                auto_remove=connection.auto_remove,
            )
        except Exception:
            logger.exception("IdP group sync failed for user {}", user.id)
    return user
