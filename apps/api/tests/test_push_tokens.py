"""Push device tokens + gated fan-out — COS-222 backend (COS-290)."""

import uuid
from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import update as sa_update

from elliptic.core.config import get_settings
from elliptic.core.database import session_factory
from elliptic.core.models_base import utcnow
from elliptic.modules.notifications import service as notif_service
from elliptic.modules.tasks.models import Task
from tests.helpers import API, create_org, create_project, create_task, register_and_login

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

    async def fake_send(
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, object],
        *,
        badge: int | None = None,
    ) -> None:
        captured["tokens"] = tokens
        captured["title"] = title
        captured["badge"] = badge

    monkeypatch.setattr(notif_service, "_send_expo_push", fake_send)
    monkeypatch.setattr(get_settings(), "push_enabled", True)
    async with session_factory() as s:
        await notif_service._fanout_push(
            s,
            uuid.UUID(me["id"]),
            uuid.UUID(org["id"]),
            "New mention",
            "hello",
            {"entity_type": "task"},
        )
    assert EXPO_TOKEN in captured.get("tokens", [])
    assert captured["title"] == "New mention"

    captured.clear()
    monkeypatch.setattr(get_settings(), "push_enabled", False)
    async with session_factory() as s:
        await notif_service._fanout_push(s, uuid.UUID(me["id"]), uuid.UUID(org["id"]), "x", "y", {})
    assert captured == {}

    rev = await client.delete(f"{base}/{EXPO_TOKEN}", headers=h)
    assert rev.status_code == 200, rev.text


async def test_board_events_notify_including_the_actor(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Creating a task and moving it both notify, and reach the person who did it.

    Everything else in the inbox is addressed to you by someone else, so
    ``notify`` drops self-directed rows. These two are receipts and deliberately
    do not, which is the behaviour worth pinning down.
    """
    auth = await register_and_login(client)
    h = auth["headers"]
    me = (await client.get(f"{API}/users/me", headers=h)).json()["data"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])

    sent: list[dict[str, object]] = []

    async def fake_send(
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, object],
        *,
        badge: int | None = None,
    ) -> None:
        sent.append({"title": title, "data": data, "badge": badge})

    monkeypatch.setattr(notif_service, "_send_expo_push", fake_send)
    monkeypatch.setattr(get_settings(), "push_enabled", True)
    await client.post(
        f"{API}/orgs/{org['id']}/notifications/devices",
        json={"platform": "ios", "token": EXPO_TOKEN},
        headers=h,
    )

    task = await create_task(client, h, org["id"], project["id"], title="Ship the thing")
    created = [s for s in sent if s["data"]["type"] == "task_created"]  # type: ignore[index]
    assert created, "creating a task notified nobody, not even its creator"
    assert created[0]["data"]["identifier"] == f"{project['key']}-{task['number']}"  # type: ignore[index]

    # Inside the creation grace window a status move is silent on purpose: the
    # "created" push landed seconds ago and the two together read as spam.
    sent.clear()
    early = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "todo"},
        headers=h,
    )
    assert early.status_code == 200, early.text
    assert not [s for s in sent if s["data"]["type"] == "status_changed"]  # type: ignore[index]

    # Age the task past that window; now the move is worth telling people about.
    async with session_factory() as s:
        await s.execute(
            sa_update(Task)
            .where(Task.id == uuid.UUID(task["id"]))
            .values(created_at=utcnow() - timedelta(hours=1))
        )
        await s.commit()

    sent.clear()
    moved = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=h,
    )
    assert moved.status_code == 200, moved.text
    changed = [s for s in sent if s["data"]["type"] == "status_changed"]  # type: ignore[index]
    assert changed, "moving a task notified nobody"
    assert "In Progress" in str(changed[0]["title"])
    assert changed[0]["data"]["entity_id"] == task["id"]  # type: ignore[index]

    inbox = (await client.get(f"{API}/orgs/{org['id']}/notifications", headers=h)).json()["data"]
    kinds = {n["type"] for n in inbox["items"]}
    assert {"task_created", "status_changed"} <= kinds, kinds
    # The receipts landed in the actor's own inbox — nobody else exists here.
    assert all(n["recipient_id"] == me["id"] for n in inbox["items"] if "recipient_id" in n)
    assert inbox["unread_count"] >= 2
