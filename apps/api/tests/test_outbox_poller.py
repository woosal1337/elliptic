"""Outbox poller: backoff, dead-letter, retry, scheduler drain (COS-274)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.outbox import service as outbox_service
from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def test_dead_letter_and_retry(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="EVT")
    await client.post(
        f"{API}/orgs/{org['id']}/webhooks",
        json={"url": "https://bad.example.com/hook", "event_types": ["task.created"]},
        headers=h,
    )
    await create_task(client, h, org["id"], project["id"], title="boom")

    async def failing(url: str, body: str, signature: str) -> int:
        return 500

    monkeypatch.setattr(outbox_service, "post_to_endpoint", failing)

    await client.post(f"{API}/orgs/{org['id']}/webhooks/events/dispatch", headers=h)
    pending = await client.get(
        f"{API}/orgs/{org['id']}/webhooks/events", params={"status": "pending"}, headers=h
    )
    evs = [e for e in pending.json()["data"] if e["event_type"] == "task.created"]
    assert evs
    assert evs[0]["attempts"] == 1
    assert evs[0]["next_attempt_at"] is not None
    assert evs[0]["failed"] is False

    from sqlalchemy import update  # noqa: PLC0415

    from elliptic.core.database import session_factory  # noqa: PLC0415
    from elliptic.modules.outbox.models import EventOutbox  # noqa: PLC0415

    for _ in range(5):
        async with session_factory() as s:
            await s.execute(update(EventOutbox).values(next_attempt_at=None))
            await s.commit()
        await client.post(f"{API}/orgs/{org['id']}/webhooks/events/dispatch", headers=h)

    failed = await client.get(
        f"{API}/orgs/{org['id']}/webhooks/events", params={"status": "failed"}, headers=h
    )
    dead = [e for e in failed.json()["data"] if e["event_type"] == "task.created"]
    assert dead
    assert dead[0]["failed"] is True

    retried = await client.post(
        f"{API}/orgs/{org['id']}/webhooks/events/{dead[0]['id']}/retry", headers=h
    )
    assert retried.status_code == 200, retried.text
    assert retried.json()["data"]["failed"] is False
    assert retried.json()["data"]["attempts"] == 0


async def test_scheduler_drains_all_orgs(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="DRN")
    await create_task(client, h, org["id"], project["id"], title="drain me")

    from elliptic.core import jobs  # noqa: PLC0415
    from elliptic.core.database import session_factory  # noqa: PLC0415

    async with session_factory() as s:
        drained = await jobs.drain_outbox(s)
    assert drained >= 1
    delivered = await client.get(
        f"{API}/orgs/{org['id']}/webhooks/events", params={"status": "delivered"}, headers=h
    )
    assert any(e["event_type"] == "task.created" for e in delivered.json()["data"])
