"""MCP OAuth signing-key and access-token tests."""

import uuid

import pytest

from elliptic.core.database import session_factory
from elliptic.core.exceptions import UnauthorizedError
from elliptic.modules.mcp_auth.tokens import (
    build_jwks,
    ensure_signing_key,
    mcp_resource_uri,
    mint_access_token,
    verify_access_token,
)


async def test_signing_key_is_stable() -> None:
    async with session_factory() as session:
        first = await ensure_signing_key(session)
        await session.commit()
    async with session_factory() as session:
        second = await ensure_signing_key(session)
    assert first.kid == second.kid


async def test_mint_and_verify_roundtrip() -> None:
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()
    async with session_factory() as session:
        token, _jti, _expires = await mint_access_token(
            session,
            user_id=user_id,
            org_id=org_id,
            client_id="client-1",
            scopes=["tasks:read", "notes:read"],
            grant_id=uuid.uuid4(),
        )
        await session.commit()
    async with session_factory() as session:
        claims = await verify_access_token(session, token, org_id)
    assert claims["sub"] == str(user_id)
    assert claims["aud"] == mcp_resource_uri(org_id)
    assert claims["scope"] == "tasks:read notes:read"


async def test_verify_rejects_cross_org_audience() -> None:
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    async with session_factory() as session:
        token, _jti, _expires = await mint_access_token(
            session,
            user_id=uuid.uuid4(),
            org_id=org_a,
            client_id="client-1",
            scopes=["tasks:read"],
            grant_id=uuid.uuid4(),
        )
        await session.commit()
    async with session_factory() as session:
        with pytest.raises(UnauthorizedError):
            await verify_access_token(session, token, org_b)


async def test_jwks_exposes_active_key() -> None:
    async with session_factory() as session:
        await ensure_signing_key(session)
        await session.commit()
    async with session_factory() as session:
        jwks = await build_jwks(session)
    assert jwks["keys"]
    assert all(key["kty"] == "RSA" for key in jwks["keys"])
