"""Push device tokens + gated fan-out — COS-222 backend (COS-290)."""

import uuid

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.core.database import session_factory
from elliptic.modules.notifications import service as notif_service
from tests.helpers import API, create_org, register_and_login

EXPO_TOKEN = "ExponentPushToken[abcDEF123]"


async def test_register_revoke_and_fanout(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    me = (await client.get(f"{API}/users/me", headers=h)).json()["data"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/notifications/devices"

    reg = await client.post(base, json={"platform": "ios", "token": EXPO_TOKEN}, headers=h)
    assert reg.status_code == 201, reg.text
    assert reg.json()["data"]["token"] == EXPO_TOKEN
    again = await client.post(base, json={"platform": "ios", "token": EXPO_TOKEN}, headers=h)
    assert again.status_code == 201

    captured: dict[str, object] = {}

    async def fake_send(tokens: list[str], title: str, body: str, data: dict[str, object]) -> None:
        captured["tokens"] = tokens
        captured["title"] = title

    monkeypatch.setattr(notif_service, "_send_expo_push", fake_send)
    monkeypatch.setattr(get_settings(), "push_enabled", True)
    async with session_factory() as s:
        await notif_service._fanout_push(
            s, uuid.UUID(me["id"]), "New mention", "hello", {"entity_type": "task"}
        )
    assert EXPO_TOKEN in captured.get("tokens", [])
    assert captured["title"] == "New mention"

    captured.clear()
    monkeypatch.setattr(get_settings(), "push_enabled", False)
    async with session_factory() as s:
        await notif_service._fanout_push(s, uuid.UUID(me["id"]), "x", "y", {})
    assert captured == {}

    rev = await client.delete(f"{base}/{EXPO_TOKEN}", headers=h)
    assert rev.status_code == 200, rev.text
