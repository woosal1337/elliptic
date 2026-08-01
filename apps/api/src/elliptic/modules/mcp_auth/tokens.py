"""RS256 signing-key management, JWKS, and MCP access-token mint/verify."""

import base64
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.exceptions import UnauthorizedError
from elliptic.modules.mcp_auth.models import OAuthSigningKey, SigningKeyStatus

_SIGNING_AAD = b"oauth-signing"


def mcp_resource_uri(org_id: uuid.UUID) -> str:
    """Return the per-organization canonical MCP resource URI used as the token audience."""
    base = get_settings().mcp_resource_base.rstrip("/")
    return f"{base}/orgs/{org_id}"


def user_resource_uri() -> str:
    """Return the org-agnostic MCP resource URI used as the audience for multi-org tokens."""
    return get_settings().mcp_resource_base.rstrip("/")


def _b64url_uint(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8 or 1, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _public_jwk(public_key: rsa.RSAPublicKey, kid: str) -> dict[str, str]:
    numbers = public_key.public_numbers()
    return {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": kid,
        "n": _b64url_uint(numbers.n),
        "e": _b64url_uint(numbers.e),
    }


async def ensure_signing_key(session: AsyncSession) -> OAuthSigningKey:
    """Return the active signing key, generating and persisting one when none exists."""
    existing = await session.scalar(
        select(OAuthSigningKey).where(OAuthSigningKey.status == SigningKeyStatus.ACTIVE)
    )
    if existing is not None:
        return existing
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    kid = uuid.uuid4().hex
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    nonce, ciphertext = encrypt_secret(pem, get_settings().kek_bytes, _SIGNING_AAD)
    key = OAuthSigningKey(
        kid=kid,
        algorithm="RS256",
        public_jwk=_public_jwk(private_key.public_key(), kid),
        encrypted_private_key=ciphertext,
        nonce=nonce,
        status=SigningKeyStatus.ACTIVE,
    )
    session.add(key)
    await session.flush()
    return key


async def build_jwks(session: AsyncSession) -> dict[str, list[dict[str, str]]]:
    """Return the public JWKS document for active and next signing keys."""
    keys = await session.scalars(
        select(OAuthSigningKey).where(OAuthSigningKey.status != SigningKeyStatus.RETIRED)
    )
    return {"keys": [key.public_jwk for key in keys]}


async def mint_access_token(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    client_id: str,
    scopes: list[str],
    grant_id: uuid.UUID,
    org_id: uuid.UUID | None = None,
    cross_org: bool = False,
) -> tuple[str, uuid.UUID, datetime]:
    """Sign a short-lived RS256 access token.

    A single-org token is bound to one organization's audience (``<base>/orgs/<id>``).
    A multi-org token (``cross_org=True``) uses the org-agnostic base audience and
    carries no ``org_id`` claim; the caller selects a target org per request and
    membership is re-verified live on every call.
    """
    key = await ensure_signing_key(session)
    pem = decrypt_secret(
        key.nonce, key.encrypted_private_key, get_settings().kek_bytes, _SIGNING_AAD
    )
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=get_settings().mcp_access_token_expire_minutes)
    jti = uuid.uuid4()
    if cross_org:
        audience = user_resource_uri()
    else:
        if org_id is None:
            raise ValueError("org_id is required for a single-org access token")
        audience = mcp_resource_uri(org_id)
    claims: dict[str, Any] = {
        "sub": str(user_id),
        "aud": audience,
        "scope": " ".join(scopes),
        "client_id": client_id,
        "grant_id": str(grant_id),
        "jti": str(jti),
        "iat": now,
        "exp": expires_at,
        "iss": get_settings().oauth_issuer,
    }
    if cross_org:
        claims["cross_org"] = True
    else:
        claims["org_id"] = str(org_id)
    token = jwt.encode(claims, pem, algorithm="RS256", headers={"kid": key.kid})
    return token, jti, expires_at


async def _decode_verified(session: AsyncSession, token: str, *, audience: str) -> dict[str, Any]:
    """Verify an MCP access token's signature, audience, and issuer against the JWKS."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid token") from exc
    key = await session.scalar(
        select(OAuthSigningKey).where(OAuthSigningKey.kid == header.get("kid"))
    )
    if key is None:
        raise UnauthorizedError("Unknown signing key")
    public_key = cast(
        rsa.RSAPublicKey, jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key.public_jwk))
    )
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=get_settings().oauth_issuer,
        )
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid token") from exc
    return claims


async def verify_access_token(
    session: AsyncSession, token: str, org_id: uuid.UUID
) -> dict[str, Any]:
    """Verify a single-org token's signature, per-org audience, and issuer."""
    return await _decode_verified(session, token, audience=mcp_resource_uri(org_id))


async def verify_multi_org_token(session: AsyncSession, token: str) -> dict[str, Any]:
    """Verify a multi-org token's signature, org-agnostic audience, and issuer."""
    return await _decode_verified(session, token, audience=user_resource_uri())
