"""Integration connection endpoints (INTE-BE-01..06)."""

import uuid

import pytest
from httpx import AsyncClient

from elliptic.modules.integrations import slack_client
from tests.helpers import API, create_org, register_and_login


async def test_slack_connection_defaults_to_disconnected(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    response = await client.get(
        f"{API}/orgs/{org['id']}/integrations/slack", headers=auth["headers"]
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data == {"connected": False, "team_name": None}


async def test_slack_connection_requires_membership(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    outsider = await register_and_login(client)
    response = await client.get(
        f"{API}/orgs/{org['id']}/integrations/slack", headers=outsider["headers"]
    )
    assert response.status_code == 404, response.text


async def test_slack_connection_unknown_org_is_404(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    response = await client.get(
        f"{API}/orgs/{uuid.uuid4()}/integrations/slack", headers=auth["headers"]
    )
    assert response.status_code == 404, response.text


async def _oauth_connect(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> tuple[dict[str, str], str]:
    async def fake_exchange(code: str, *, transport: object = None) -> dict[str, str]:
        assert code == "oauth-code-123"
        return {"access_token": "xoxb-fake", "team_id": "T1", "team_name": "Acme HQ"}

    monkeypatch.setattr(slack_client, "exchange_oauth_code", fake_exchange)
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/integrations/slack/oauth-callback",
        json={"code": "oauth-code-123"},
        headers=auth["headers"],
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"] == {"connected": True, "team_name": "Acme HQ"}
    return auth["headers"], org["id"]


async def test_oauth_connect_then_status_reports_connected(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id = await _oauth_connect(client, monkeypatch)
    status = await client.get(f"{API}/orgs/{org_id}/integrations/slack", headers=headers)
    assert status.json()["data"]["connected"] is True


async def test_channels_require_connection_then_list(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    not_connected = await client.get(
        f"{API}/orgs/{org['id']}/integrations/slack/channels", headers=auth["headers"]
    )
    assert not_connected.status_code == 400, not_connected.text

    headers, org_id = await _oauth_connect(client, monkeypatch)

    async def fake_list(token: str, *, transport: object = None) -> list[dict[str, str]]:
        assert token == "xoxb-fake"
        return [{"id": "C1", "name": "general"}, {"id": "C2", "name": "eng"}]

    monkeypatch.setattr(slack_client, "list_channels", fake_list)
    listed = await client.get(f"{API}/orgs/{org_id}/integrations/slack/channels", headers=headers)
    assert listed.status_code == 200, listed.text
    assert [c["name"] for c in listed.json()["data"]] == ["general", "eng"]
