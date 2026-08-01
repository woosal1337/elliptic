"""HTTP-level tests for the OAuth authorization-server endpoints."""

import base64
import hashlib
import uuid
from urllib.parse import parse_qs, urlparse

from httpx import AsyncClient

from elliptic.core.config import get_settings
from tests.helpers import create_org, register_and_login

_REDIRECT = "http://127.0.0.1:53999/callback"
# The canonical MCP resource URI the server validates against (RFC 8707/9728);
# derived from settings so it tracks the configured value instead of drifting.
_RESOURCE = get_settings().mcp_resource_base


def _pkce_pair() -> tuple[str, str]:
    verifier = (
        base64.urlsafe_b64encode(uuid.uuid4().bytes + uuid.uuid4().bytes).rstrip(b"=").decode()
    )
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=")
    return verifier, challenge.decode()


async def test_discovery_documents(client: AsyncClient) -> None:
    meta = await client.get("/.well-known/oauth-authorization-server")
    assert meta.status_code == 200
    body = meta.json()
    assert body["code_challenge_methods_supported"] == ["S256"]
    assert body["authorization_response_iss_parameter_supported"] is True

    prm = await client.get("/.well-known/oauth-protected-resource/api/v1/mcp")
    assert prm.status_code == 200
    assert prm.json()["resource"] == _RESOURCE


async def test_full_http_authorization_flow(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    verifier, challenge = _pkce_pair()

    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "Claude Code", "redirect_uris": [_REDIRECT]},
    )
    assert registration.status_code == 201, registration.text
    client_id = registration.json()["client_id"]

    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "tasks:read tasks:write",
            "resource": _RESOURCE,
            "state": "abc",
        },
        headers=auth["headers"],
    )
    assert authorize.status_code == 302
    request_id = parse_qs(urlparse(authorize.headers["location"]).query)["request_id"][0]

    consent = await client.get(
        "/api/v1/oauth/consent", params={"request_id": request_id}, headers=auth["headers"]
    )
    assert consent.status_code == 200, consent.text
    context = consent.json()["data"]
    assert context["client_unverified"] is True
    assert any(o["id"] == org["id"] for o in context["orgs"])

    decision = await client.post(
        "/api/v1/oauth/authorize/decision",
        json={
            "request_id": request_id,
            "decision": "allow",
            "org_id": org["id"],
            "scopes": ["tasks:read", "tasks:write"],
        },
        headers=auth["headers"],
    )
    assert decision.status_code == 200, decision.text
    redirect_to = decision.json()["data"]["redirect_to"]
    code = parse_qs(urlparse(redirect_to).query)["code"][0]

    token = await client.post(
        "/api/v1/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": _REDIRECT,
            "resource": _RESOURCE,
        },
    )
    assert token.status_code == 200, token.text
    payload = token.json()
    assert payload["token_type"] == "Bearer"
    assert payload["scope"] == "tasks:read tasks:write"
    assert payload["access_token"]
    assert payload["refresh_token"]

    jwks = await client.get("/api/v1/oauth/jwks.json")
    assert jwks.status_code == 200
    assert jwks.json()["keys"]

    grants = await client.get("/api/v1/oauth/grants", headers=auth["headers"])
    assert grants.status_code == 200
    grant_list = grants.json()["data"]
    assert len(grant_list) == 1
    assert grant_list[0]["org_name"] == "Acme"
    assert set(grant_list[0]["scopes"]) == {"tasks:read", "tasks:write"}

    revoked = await client.delete(
        f"/api/v1/oauth/grants/{grant_list[0]['grant_id']}", headers=auth["headers"]
    )
    assert revoked.status_code == 200
    after = await client.get("/api/v1/oauth/grants", headers=auth["headers"])
    assert after.json()["data"] == []


async def test_full_flow_without_resource_parameter(client: AsyncClient) -> None:
    """Clients that lag RFC 8707 omit ``resource`` entirely; the flow must still work."""
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    verifier, challenge = _pkce_pair()
    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "JetBrains Air", "redirect_uris": [_REDIRECT]},
    )
    client_id = registration.json()["client_id"]

    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "tasks:read",
        },
        headers=auth["headers"],
    )
    assert authorize.status_code == 302, authorize.text
    request_id = parse_qs(urlparse(authorize.headers["location"]).query)["request_id"][0]

    decision = await client.post(
        "/api/v1/oauth/authorize/decision",
        json={
            "request_id": request_id,
            "decision": "allow",
            "org_id": org["id"],
            "scopes": ["tasks:read"],
        },
        headers=auth["headers"],
    )
    code = parse_qs(urlparse(decision.json()["data"]["redirect_to"]).query)["code"][0]

    token = await client.post(
        "/api/v1/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": _REDIRECT,
        },
    )
    assert token.status_code == 200, token.text
    assert token.json()["access_token"]


async def test_consent_grants_writes_when_client_requests_no_scope(client: AsyncClient) -> None:
    """MCP clients send no ``scope`` parameter; the user's consent decision is the grant."""
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    verifier, challenge = _pkce_pair()
    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "Claude Code", "redirect_uris": [_REDIRECT]},
    )
    client_id = registration.json()["client_id"]

    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "resource": _RESOURCE,
        },
        headers=auth["headers"],
    )
    request_id = parse_qs(urlparse(authorize.headers["location"]).query)["request_id"][0]

    decision = await client.post(
        "/api/v1/oauth/authorize/decision",
        json={
            "request_id": request_id,
            "decision": "allow",
            "org_id": org["id"],
            "scopes": ["tasks:read", "tasks:write", "comments:write", "not-a-real-scope"],
        },
        headers=auth["headers"],
    )
    assert decision.status_code == 200, decision.text
    code = parse_qs(urlparse(decision.json()["data"]["redirect_to"]).query)["code"][0]

    token = await client.post(
        "/api/v1/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": _REDIRECT,
        },
    )
    assert token.status_code == 200, token.text
    assert set(token.json()["scope"].split()) == {"tasks:read", "tasks:write", "comments:write"}


async def test_explicit_scope_request_caps_the_grant(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    verifier, challenge = _pkce_pair()
    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "Claude Code", "redirect_uris": [_REDIRECT]},
    )
    client_id = registration.json()["client_id"]

    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "tasks:read",
            "resource": _RESOURCE,
        },
        headers=auth["headers"],
    )
    request_id = parse_qs(urlparse(authorize.headers["location"]).query)["request_id"][0]

    decision = await client.post(
        "/api/v1/oauth/authorize/decision",
        json={
            "request_id": request_id,
            "decision": "allow",
            "org_id": org["id"],
            "scopes": ["tasks:read", "tasks:write", "comments:write"],
        },
        headers=auth["headers"],
    )
    assert decision.status_code == 200, decision.text
    code = parse_qs(urlparse(decision.json()["data"]["redirect_to"]).query)["code"][0]

    token = await client.post(
        "/api/v1/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": _REDIRECT,
        },
    )
    assert token.status_code == 200, token.text
    assert token.json()["scope"] == "tasks:read"


async def test_authorize_rejects_foreign_resource(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    await create_org(client, auth["headers"])
    _verifier, challenge = _pkce_pair()
    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "Claude Code", "redirect_uris": [_REDIRECT]},
    )
    client_id = registration.json()["client_id"]
    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "tasks:read",
            "resource": "https://attacker.example.com/api/v1/mcp",
        },
        headers=auth["headers"],
    )
    assert authorize.status_code == 400


async def test_decision_rejects_non_member_org(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    await create_org(client, auth["headers"])
    _verifier, challenge = _pkce_pair()
    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "Claude Code", "redirect_uris": [_REDIRECT]},
    )
    client_id = registration.json()["client_id"]
    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "tasks:read",
            "resource": _RESOURCE,
        },
        headers=auth["headers"],
    )
    request_id = parse_qs(urlparse(authorize.headers["location"]).query)["request_id"][0]
    decision = await client.post(
        "/api/v1/oauth/authorize/decision",
        json={
            "request_id": request_id,
            "decision": "allow",
            "org_id": str(uuid.uuid4()),
            "scopes": ["tasks:read"],
        },
        headers=auth["headers"],
    )
    assert decision.status_code == 403


async def test_decision_rejects_cross_site_origin(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    _verifier, challenge = _pkce_pair()
    registration = await client.post(
        "/api/v1/oauth/register",
        json={"client_name": "Claude Code", "redirect_uris": [_REDIRECT]},
    )
    client_id = registration.json()["client_id"]
    authorize = await client.get(
        "/api/v1/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _REDIRECT,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "tasks:read",
            "resource": _RESOURCE,
        },
        headers=auth["headers"],
    )
    request_id = parse_qs(urlparse(authorize.headers["location"]).query)["request_id"][0]
    decision = await client.post(
        "/api/v1/oauth/authorize/decision",
        json={
            "request_id": request_id,
            "decision": "allow",
            "org_id": org["id"],
            "scopes": ["tasks:read"],
        },
        headers={**auth["headers"], "Origin": "http://evil.example.com"},
    )
    assert decision.status_code == 403
