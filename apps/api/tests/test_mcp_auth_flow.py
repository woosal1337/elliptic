"""End-to-end OAuth authorization-code flow tests at the service layer."""

import base64
import hashlib
import uuid

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.core.database import session_factory
from elliptic.core.exceptions import BadRequestError, ForbiddenError, UnauthorizedError
from elliptic.modules.mcp_auth import service
from elliptic.modules.mcp_auth.resolver import resolve_token
from tests.helpers import create_org, register_and_login

_REDIRECT = "http://127.0.0.1:53111/callback"


def _pkce_pair() -> tuple[str, str]:
    verifier = (
        base64.urlsafe_b64encode(uuid.uuid4().bytes + uuid.uuid4().bytes).rstrip(b"=").decode()
    )
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=")
    return verifier, challenge.decode()


async def _register_client() -> str:
    async with session_factory() as session:
        client = await service.register_client(
            session, client_name="Claude Code", redirect_uris=[_REDIRECT]
        )
        await session.commit()
        return client.client_id


async def _run_flow(
    user_id: uuid.UUID, org_id: uuid.UUID, scopes: list[str]
) -> tuple[str, service.TokenResult]:
    client_id = await _register_client()
    verifier, challenge = _pkce_pair()
    request_id = service.sign_authorization_request(
        client_id=client_id,
        redirect_uri=_REDIRECT,
        code_challenge=challenge,
        code_challenge_method="S256",
        scope=scopes,
        resource=get_settings().mcp_resource_base,
        state="xyz",
    )
    request = service.decode_authorization_request(request_id)
    async with session_factory() as session:
        code = await service.issue_authorization_code(
            session, request=request, user_id=user_id, org_id=org_id, scopes=scopes
        )
        await session.commit()
    async with session_factory() as session:
        result = await service.exchange_code(
            session,
            code=code,
            code_verifier=verifier,
            redirect_uri=_REDIRECT,
            client_id=client_id,
            resource=get_settings().mcp_resource_base,
        )
        await session.commit()
    return client_id, result


async def test_full_authorization_code_flow(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    _client_id, result = await _run_flow(
        uuid.UUID(auth["user_id"]), uuid.UUID(org["id"]), ["tasks:read", "tasks:write"]
    )
    assert result.scope == "tasks:read tasks:write"
    async with session_factory() as session:
        principal = await resolve_token(session, result.access_token)
    assert str(principal.user.id) == auth["user_id"]
    assert str(principal.org.id) == org["id"]
    assert "tasks:write" in principal.scopes
    principal.require_scope("tasks:write")
    with pytest.raises(ForbiddenError):
        principal.require_scope("sources:manage")


async def test_exchange_rejects_bad_pkce(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    client_id = await _register_client()
    _verifier, challenge = _pkce_pair()
    request_id = service.sign_authorization_request(
        client_id=client_id,
        redirect_uri=_REDIRECT,
        code_challenge=challenge,
        code_challenge_method="S256",
        scope=["tasks:read"],
        resource=get_settings().mcp_resource_base,
        state=None,
    )
    request = service.decode_authorization_request(request_id)
    async with session_factory() as session:
        code = await service.issue_authorization_code(
            session,
            request=request,
            user_id=uuid.UUID(auth["user_id"]),
            org_id=uuid.UUID(org["id"]),
            scopes=["tasks:read"],
        )
        await session.commit()
    async with session_factory() as session:
        with pytest.raises(BadRequestError):
            await service.exchange_code(
                session,
                code=code,
                code_verifier="wrong-verifier",
                redirect_uri=_REDIRECT,
                client_id=client_id,
                resource=get_settings().mcp_resource_base,
            )


async def test_refresh_rotation_and_reuse_detection(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    client_id, result = await _run_flow(
        uuid.UUID(auth["user_id"]), uuid.UUID(org["id"]), ["tasks:read"]
    )
    async with session_factory() as session:
        rotated = await service.refresh_tokens(
            session, refresh_token=result.refresh_token, client_id=client_id
        )
        await session.commit()
    assert rotated.access_token != result.access_token
    async with session_factory() as session:
        with pytest.raises(BadRequestError):
            await service.refresh_tokens(
                session, refresh_token=result.refresh_token, client_id=client_id
            )
        await session.commit()
    async with session_factory() as session:
        with pytest.raises(UnauthorizedError):
            await resolve_token(session, rotated.access_token)


async def test_revoke_kills_token(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    _client_id, result = await _run_flow(
        uuid.UUID(auth["user_id"]), uuid.UUID(org["id"]), ["tasks:read"]
    )
    async with session_factory() as session:
        await service.revoke_token(session, token=result.access_token)
        await session.commit()
    async with session_factory() as session:
        with pytest.raises(UnauthorizedError):
            await resolve_token(session, result.access_token)
