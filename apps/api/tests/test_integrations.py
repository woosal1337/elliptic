"""Integration connection endpoints (INTE-BE-01..06)."""

import uuid

import pytest
from httpx import AsyncClient

from elliptic.modules.integrations import slack_client
from elliptic.modules.integrations.service import build_slack_message
from tests.helpers import API, create_org, import_meeting, register_and_login


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


def test_build_slack_message() -> None:
    text = build_slack_message(
        "Weekly sync", "We shipped the redesign.", ["Alice writes docs"], "https://x/share/m/tok"
    )
    assert "*Weekly sync*" in text
    assert "We shipped the redesign." in text
    assert "• Alice writes docs" in text
    assert "<https://x/share/m/tok|Ask about this meeting>" in text


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


async def test_send_meeting_to_slack(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers, org_id = await _oauth_connect(client, monkeypatch)
    posted: dict[str, str] = {}

    async def fake_post(
        token: str, channel_id: str, text: str, *, transport: object = None
    ) -> None:
        posted["token"] = token
        posted["channel_id"] = channel_id
        posted["text"] = text

    monkeypatch.setattr(slack_client, "post_message", fake_post)
    meeting = await import_meeting(client, headers, org_id)
    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/slack",
        json={"channel_id": "C1"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"] == {"ok": True}
    assert posted["token"] == "xoxb-fake"
    assert posted["channel_id"] == "C1"
    assert "Weekly sync" in posted["text"]


async def test_send_without_connection_fails(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    meeting = await import_meeting(client, auth["headers"], org["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/slack",
        json={"channel_id": "C1"},
        headers=auth["headers"],
    )
    assert response.status_code == 400, response.text
