"""HTTP+PAT MCP transport: a personal access token resolves an MCP principal (COS-235)."""

import pytest
from httpx import AsyncClient

from elliptic.core.database import session_factory
from elliptic.core.exceptions import UnauthorizedError
from elliptic.modules.mcp_auth import scopes as scope_catalog
from elliptic.modules.mcp_auth.resolver import resolve_token
from tests.helpers import API, create_org, register_and_login


async def test_pat_resolves_full_scope_cross_org_principal(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    await create_org(client, auth["headers"])
    raw = (
        await client.post(
            f"{API}/users/me/tokens", json={"name": "MCP key"}, headers=auth["headers"]
        )
    ).json()["data"]["token"]

    async with session_factory() as session:
        principal = await resolve_token(session, raw)

    assert principal.cross_org is True
    assert principal.user.email == auth["email"]
    assert principal.scopes == frozenset(scope_catalog.ALL_SCOPES)
    assert principal.client_id == "personal-access-token"


async def test_invalid_pat_rejected() -> None:
    async with session_factory() as session:
        with pytest.raises(UnauthorizedError):
            await resolve_token(session, "cos_pat_not_a_real_token")
