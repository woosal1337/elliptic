"""Event backbone: outbox capture + webhook dispatch (COS-247)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.outbox import service as outbox_service
from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def test_outbox_capture_and_webhook_dispatch(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    hook = await client.post(
        f"{API}/orgs/{org['id']}/webhooks",
        json={"url": "https://example.com/hook", "event_types": ["task.created"]},
        headers=h,
    )
    assert hook.status_code == 201, hook.text

    project = await create_project(client, h, org["id"], key="EVT")
    await create_task(client, h, org["id"], project["id"], title="Emit an event")

    events = await client.get(f"{API}/orgs/{org['id']}/webhooks/events", headers=h)
    assert events.status_code == 200, events.text
    types = {e["event_type"] for e in events.json()["data"]}
    assert "task.created" in types
    assert all(e["delivered_at"] is None for e in events.json()["data"])

    captured: list[tuple[str, str]] = []

    async def fake_post(url: str, body: str, signature: str) -> int:
        captured.append((url, signature))
        return 200

    monkeypatch.setattr(outbox_service, "post_to_endpoint", fake_post)
    dispatch = await client.post(f"{API}/orgs/{org['id']}/webhooks/events/dispatch", headers=h)
    assert dispatch.status_code == 200, dispatch.text
    assert dispatch.json()["data"]["delivered"] >= 1
    assert any(url == "https://example.com/hook" and sig for url, sig in captured)

    captured.clear()
    again = await client.post(f"{API}/orgs/{org['id']}/webhooks/events/dispatch", headers=h)
    assert again.json()["data"]["delivered"] == 0
