"""OAuth 2.1 authorization-server logic: clients, PKCE codes, tokens, grants."""

import base64
import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlparse

import jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from companyos.core.config import get_settings
from companyos.core.exceptions import BadRequestError, NotFoundError
from companyos.modules.mcp_auth import scopes as scope_catalog
from companyos.modules.mcp_auth.models import (
    ClientRegistrationType,
    GrantStatus,
    OAuthAccessToken,
    OAuthAuthorizationCode,
    OAuthClient,
    OAuthGrant,
    OAuthRefreshToken,
)
from companyos.modules.mcp_auth.tokens import (
    mcp_resource_uri,
    mint_access_token,
    user_resource_uri,
)
from companyos.modules.orgs.models import Organization

_CODE_TTL = timedelta(seconds=60)
_REQUEST_TTL = timedelta(minutes=10)
_LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


@dataclass(frozen=True)
class TokenResult:
    """The token endpoint's issued credentials."""

    access_token: str
    refresh_token: str
    expires_in: int
    scope: str


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _pkce_matches(verifier: str, challenge: str) -> bool:
    digest = hashlib.sha256(verifier.encode()).digest()
    computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return secrets.compare_digest(computed, challenge)


def _validate_redirect_uri(uri: str) -> None:
    parsed = urlparse(uri)
    if parsed.scheme == "https":
        return
    if parsed.scheme == "http" and parsed.hostname in _LOOPBACK_HOSTS:
        return
    raise BadRequestError("redirect_uri must be https or loopback http")


async def register_client(
    session: AsyncSession,
    *,
    client_name: str,
    redirect_uris: list[str],
    grant_types: list[str] | None = None,
) -> OAuthClient:
    """Register a public PKCE client (RFC 7591 dynamic client registration)."""
    if not redirect_uris:
        raise BadRequestError("redirect_uris is required")
    for uri in redirect_uris:
        _validate_redirect_uri(uri)
    client = OAuthClient(
        client_id=f"mcp-{uuid.uuid4().hex}",
        registration_type=ClientRegistrationType.DCR,
        client_name=(client_name or "AI client")[:255],
        redirect_uris=redirect_uris,
        grant_types=grant_types or ["authorization_code", "refresh_token"],
        token_endpoint_auth_method="none",  # noqa: S106
        is_active=True,
    )
    session.add(client)
    await session.flush()
    return client


async def load_active_client(session: AsyncSession, client_id: str) -> OAuthClient:
    """Load an active registered client, or reject the request."""
    client = await session.scalar(
        select(OAuthClient).where(
            OAuthClient.client_id == client_id, OAuthClient.is_active.is_(True)
        )
    )
    if client is None:
        raise BadRequestError("Unknown client")
    return client


async def validate_authorize_request(
    session: AsyncSession,
    *,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
) -> OAuthClient:
    """Validate an authorization request before any consent is shown."""
    client = await load_active_client(session, client_id)
    if redirect_uri not in client.redirect_uris:
        raise BadRequestError("redirect_uri does not match a registered value")
    if code_challenge_method != "S256" or not code_challenge:
        raise BadRequestError("PKCE S256 is required")
    return client


def resolve_resource(resource: str | None) -> str:
    """Resolve the RFC 8707 resource indicator to the canonical MCP resource URI.

    A provided value must equal the canonical URI so a code minted here cannot be
    replayed against another audience. An omitted value falls back to the canonical
    URI from this server's own protected-resource metadata: OAuth clients that lag
    the MCP auth spec send no ``resource`` at all, and rejecting them would break
    their entire connect flow before the consent screen renders."""
    canonical = get_settings().mcp_resource_base.rstrip("/")
    if resource is not None and resource.rstrip("/") != canonical:
        raise BadRequestError("resource must equal the canonical MCP URI")
    return canonical


def sign_authorization_request(
    *,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
    scope: list[str],
    resource: str,
    state: str | None,
) -> str:
    """Sign the validated request parameters so consent cannot alter them."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "typ": "authz_request",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
        "scope": scope,
        "resource": resource,
        "state": state,
        "iat": now,
        "exp": now + _REQUEST_TTL,
    }
    return jwt.encode(payload, get_settings().jwt_secret_key, algorithm="HS256")


def decode_authorization_request(request_id: str) -> dict[str, Any]:
    """Decode and validate a signed authorization request."""
    try:
        payload: dict[str, Any] = jwt.decode(
            request_id, get_settings().jwt_secret_key, algorithms=["HS256"]
        )
    except jwt.InvalidTokenError as exc:
        raise BadRequestError("Invalid or expired authorization request") from exc
    if payload.get("typ") != "authz_request":
        raise BadRequestError("Invalid authorization request")
    return payload


async def issue_authorization_code(
    session: AsyncSession,
    *,
    request: dict[str, Any],
    user_id: uuid.UUID,
    org_id: uuid.UUID | None,
    scopes: list[str],
) -> str:
    """Mint a single-use PKCE authorization code bound to the chosen org and scopes.

    ``org_id=None`` marks a multi-org code: it upgrades to a cross-org grant at
    exchange time, spanning every organization the user belongs to."""
    raw_code = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    code = OAuthAuthorizationCode(
        code_hash=_sha256(raw_code),
        client_id=request["client_id"],
        user_id=user_id,
        org_id=org_id,
        scopes=scopes,
        redirect_uri=request["redirect_uri"],
        code_challenge=request["code_challenge"],
        code_challenge_method=request["code_challenge_method"],
        resource=request["resource"],
        expires_at=now + _CODE_TTL,
    )
    session.add(code)
    await session.flush()
    return raw_code


async def _upsert_grant(
    session: AsyncSession,
    *,
    client_id: str,
    user_id: uuid.UUID,
    scopes: list[str],
    granted_by: str,
    org_id: uuid.UUID | None = None,
    cross_org: bool = False,
) -> OAuthGrant:
    if cross_org:
        grant = await session.scalar(
            select(OAuthGrant).where(
                OAuthGrant.client_id == client_id,
                OAuthGrant.user_id == user_id,
                OAuthGrant.cross_org.is_(True),
            )
        )
    else:
        grant = await session.scalar(
            select(OAuthGrant).where(
                OAuthGrant.client_id == client_id,
                OAuthGrant.user_id == user_id,
                OAuthGrant.org_id == org_id,
                OAuthGrant.cross_org.is_(False),
            )
        )
    if grant is None:
        grant = OAuthGrant(
            client_id=client_id,
            user_id=user_id,
            org_id=org_id,
            cross_org=cross_org,
            scopes=scopes,
            status=GrantStatus.ACTIVE,
            granted_by=granted_by,
        )
        session.add(grant)
        await session.flush()
        return grant
    grant.scopes = scopes
    grant.status = GrantStatus.ACTIVE
    grant.revoked_at = None
    grant.revoked_reason = None
    await session.flush()
    return grant


async def _new_refresh_token(
    session: AsyncSession,
    *,
    grant: OAuthGrant,
    family_id: uuid.UUID,
) -> str:
    raw = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    record = OAuthRefreshToken(
        token_hash=_sha256(raw),
        grant_id=grant.id,
        family_id=family_id,
        user_id=grant.user_id,
        org_id=grant.org_id,
        client_id=grant.client_id,
        scopes=grant.scopes,
        expires_at=now + timedelta(days=get_settings().mcp_refresh_token_expire_days),
    )
    session.add(record)
    await session.flush()
    return raw


async def _issue_tokens(
    session: AsyncSession, grant: OAuthGrant, family_id: uuid.UUID
) -> TokenResult:
    if grant.cross_org:
        access_token, jti, expires_at = await mint_access_token(
            session,
            user_id=grant.user_id,
            client_id=grant.client_id,
            scopes=grant.scopes,
            grant_id=grant.id,
            cross_org=True,
        )
        resource = user_resource_uri()
    else:
        if grant.org_id is None:
            raise BadRequestError("single-org grant is missing org_id")
        access_token, jti, expires_at = await mint_access_token(
            session,
            user_id=grant.user_id,
            client_id=grant.client_id,
            scopes=grant.scopes,
            grant_id=grant.id,
            org_id=grant.org_id,
        )
        resource = mcp_resource_uri(grant.org_id)
    session.add(
        OAuthAccessToken(
            jti=jti,
            grant_id=grant.id,
            user_id=grant.user_id,
            org_id=grant.org_id,
            client_id=grant.client_id,
            scopes=grant.scopes,
            resource=resource,
            expires_at=expires_at,
        )
    )
    refresh_token = await _new_refresh_token(session, grant=grant, family_id=family_id)
    expires_in = int((expires_at - datetime.now(UTC)).total_seconds())
    return TokenResult(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        scope=" ".join(grant.scopes),
    )


async def exchange_code(
    session: AsyncSession,
    *,
    code: str,
    code_verifier: str,
    redirect_uri: str,
    client_id: str,
    resource: str | None,
) -> TokenResult:
    """Exchange a PKCE authorization code for an access + refresh token."""
    record = await session.scalar(
        select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.code_hash == _sha256(code))
    )
    now = datetime.now(UTC)
    if record is None or record.consumed_at is not None or record.expires_at < now:
        raise BadRequestError("invalid_grant")
    if record.client_id != client_id or record.redirect_uri != redirect_uri:
        raise BadRequestError("invalid_grant")
    if resource is not None and resource.rstrip("/") != (record.resource or "").rstrip("/"):
        raise BadRequestError("invalid_target")
    if not _pkce_matches(code_verifier, record.code_challenge):
        raise BadRequestError("invalid_grant")
    record.consumed_at = now
    grant = await _upsert_grant(
        session,
        client_id=record.client_id,
        user_id=record.user_id,
        scopes=record.scopes,
        granted_by="self",
        org_id=record.org_id,
        cross_org=record.org_id is None,
    )
    return await _issue_tokens(session, grant, uuid.uuid4())


async def _revoke_family(session: AsyncSession, grant: OAuthGrant, reason: str) -> None:
    grant.status = GrantStatus.REVOKED
    grant.revoked_at = datetime.now(UTC)
    grant.revoked_reason = reason
    await session.execute(
        update(OAuthAccessToken)
        .where(OAuthAccessToken.grant_id == grant.id, OAuthAccessToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    await session.execute(
        update(OAuthRefreshToken)
        .where(OAuthRefreshToken.grant_id == grant.id, OAuthRefreshToken.used_at.is_(None))
        .values(used_at=datetime.now(UTC))
    )
    await session.flush()


async def refresh_tokens(
    session: AsyncSession, *, refresh_token: str, client_id: str
) -> TokenResult:
    """Rotate a refresh token, revoking the whole family on reuse (RFC 9700)."""
    record = await session.scalar(
        select(OAuthRefreshToken).where(OAuthRefreshToken.token_hash == _sha256(refresh_token))
    )
    if record is None or record.client_id != client_id:
        raise BadRequestError("invalid_grant")
    grant = await session.get(OAuthGrant, record.grant_id)
    if grant is None:
        raise BadRequestError("invalid_grant")
    if record.used_at is not None:
        await _revoke_family(session, grant, "reuse_detected")
        raise BadRequestError("invalid_grant")
    if record.expires_at < datetime.now(UTC) or grant.status != GrantStatus.ACTIVE:
        raise BadRequestError("invalid_grant")
    record.used_at = datetime.now(UTC)
    result = await _issue_tokens(session, grant, record.family_id)
    refreshed = await session.scalar(
        select(OAuthRefreshToken).where(
            OAuthRefreshToken.token_hash == _sha256(result.refresh_token)
        )
    )
    if refreshed is not None:
        record.replaced_by = refreshed.id
    await session.flush()
    return result


async def revoke_token(session: AsyncSession, *, token: str) -> None:
    """Revoke a token and its grant family (RFC 7009); unknown tokens are a no-op."""
    refresh = await session.scalar(
        select(OAuthRefreshToken).where(OAuthRefreshToken.token_hash == _sha256(token))
    )
    if refresh is not None:
        grant = await session.get(OAuthGrant, refresh.grant_id)
        if grant is not None:
            await _revoke_family(session, grant, "user")
        return
    try:
        claims = jwt.decode(token, options={"verify_signature": False})
    except jwt.InvalidTokenError:
        return
    jti_raw = claims.get("jti")
    if jti_raw is None:
        return
    access = await session.scalar(
        select(OAuthAccessToken).where(OAuthAccessToken.jti == uuid.UUID(str(jti_raw)))
    )
    if access is not None:
        grant = await session.get(OAuthGrant, access.grant_id)
        if grant is not None:
            await _revoke_family(session, grant, "user")


def normalize_requested_scopes(raw: str | None) -> list[str]:
    """Return the known scopes the client requested.

    An empty result means the client sent no ``scope`` parameter (MCP clients
    generally do not): the request carries no cap, and the user's consent
    decision alone determines the grant."""
    return scope_catalog.parse_scope(raw)


async def list_grants(
    session: AsyncSession, *, user_id: uuid.UUID
) -> list[tuple[OAuthGrant, OAuthClient | None, Organization | None]]:
    """List the caller's active connected-app grants with client and org detail.

    A multi-org grant has no single organization, so ``org`` is ``None``."""
    rows = await session.execute(
        select(OAuthGrant, OAuthClient, Organization)
        .outerjoin(Organization, Organization.id == OAuthGrant.org_id)
        .outerjoin(OAuthClient, OAuthClient.client_id == OAuthGrant.client_id)
        .where(OAuthGrant.user_id == user_id, OAuthGrant.status == GrantStatus.ACTIVE)
        .order_by(OAuthGrant.created_at.desc())
    )
    return [(grant, client, org) for grant, client, org in rows.all()]


async def revoke_grant(session: AsyncSession, *, grant_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Revoke one of the caller's grant families and all its tokens."""
    grant = await session.scalar(
        select(OAuthGrant).where(OAuthGrant.id == grant_id, OAuthGrant.user_id == user_id)
    )
    if grant is None:
        raise NotFoundError("Grant not found")
    await _revoke_family(session, grant, "user")
