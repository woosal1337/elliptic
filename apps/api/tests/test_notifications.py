"""Notification creation, recipient isolation, status flow, and emit hooks."""

import uuid
from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from elliptic.core.database import session_factory
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def _seed_notification(
    *,
    org_id: str,
    recipient_id: str,
    actor_id: str | None = None,
    title: str = "Hello",
    entity_id: str | None = None,
) -> str | None:
    async with session_factory() as session:
        notification = await notify(
            session,
            org_id=uuid.UUID(org_id),
            recipient_id=uuid.UUID(recipient_id),
            type=NotificationType.MENTIONED,
            entity_type="task",
            entity_id=uuid.UUID(entity_id) if entity_id else None,
            actor_id=uuid.UUID(actor_id) if actor_id else None,
            title=title,
            snippet="snippet",
        )
        await session.commit()
        return str(notification.id) if notification is not None else None


async def test_notification_email_preferences(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    base = f"{API}/orgs/{org['id']}/notifications/preferences"

    assert (await client.get(base, headers=auth["headers"])).json()["data"] == []

    ws = await client.put(base, json={"notify_comments": False}, headers=auth["headers"])
    assert ws.status_code == 200, ws.text
    assert ws.json()["data"]["notify_comments"] is False
    assert ws.json()["data"]["notify_mentions"] is True
    assert ws.json()["data"]["project_id"] is None

    override = await client.put(
        base,
        json={"project_id": project["id"], "notify_mentions": False, "notify_comments": True},
        headers=auth["headers"],
    )
    assert override.status_code == 200, override.text
    assert override.json()["data"]["project_id"] == project["id"]

    rows = (await client.get(base, headers=auth["headers"])).json()["data"]
    assert len(rows) == 2
    by_scope = {r["project_id"]: r for r in rows}
    assert by_scope[None]["notify_comments"] is False
    assert by_scope[project["id"]]["notify_mentions"] is False
    assert by_scope[project["id"]]["notify_comments"] is True

    await client.put(base, json={"notify_completed": False}, headers=auth["headers"])
    assert len((await client.get(base, headers=auth["headers"])).json()["data"]) == 2


async def test_notify_creates_and_skips_self(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])

    created = await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])
    assert created is not None

    skipped = await _seed_notification(
        org_id=org["id"], recipient_id=auth["user_id"], actor_id=auth["user_id"]
    )
    assert skipped is None


async def test_unread_count_and_list(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])
    await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])

    count = await client.get(
        f"{API}/orgs/{org['id']}/notifications/unread-count", headers=auth["headers"]
    )
    assert count.status_code == 200
    assert count.json()["data"]["count"] == 2

    listing = await client.get(f"{API}/orgs/{org['id']}/notifications", headers=auth["headers"])
    assert listing.status_code == 200
    data = listing.json()["data"]
    assert data["unread_count"] == 2
    assert len(data["items"]) == 2


async def test_recipient_only_isolation(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    other = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], other)

    note_id = await _seed_notification(org_id=org["id"], recipient_id=owner["user_id"])

    listing = await client.get(f"{API}/orgs/{org['id']}/notifications", headers=other["headers"])
    assert listing.json()["data"]["items"] == []

    read = await client.post(
        f"{API}/orgs/{org['id']}/notifications/{note_id}/read", headers=other["headers"]
    )
    assert read.status_code == 404


async def test_read_and_read_all(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    first = await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])
    await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])

    read = await client.post(
        f"{API}/orgs/{org['id']}/notifications/{first}/read", headers=auth["headers"]
    )
    assert read.status_code == 200
    assert read.json()["data"]["read_at"] is not None

    after_one = await client.get(
        f"{API}/orgs/{org['id']}/notifications/unread-count", headers=auth["headers"]
    )
    assert after_one.json()["data"]["count"] == 1

    all_read = await client.post(
        f"{API}/orgs/{org['id']}/notifications/read-all", headers=auth["headers"]
    )
    assert all_read.status_code == 200

    after_all = await client.get(
        f"{API}/orgs/{org['id']}/notifications/unread-count", headers=auth["headers"]
    )
    assert after_all.json()["data"]["count"] == 0


async def test_archive_excludes_from_unread(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    note_id = await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])

    archived = await client.post(
        f"{API}/orgs/{org['id']}/notifications/{note_id}/archive", headers=auth["headers"]
    )
    assert archived.status_code == 200
    assert archived.json()["data"]["archived_at"] is not None

    unread = await client.get(f"{API}/orgs/{org['id']}/notifications", headers=auth["headers"])
    assert unread.json()["data"]["unread_count"] == 0

    archived_list = await client.get(
        f"{API}/orgs/{org['id']}/notifications",
        params={"status": "archived"},
        headers=auth["headers"],
    )
    assert len(archived_list.json()["data"]["items"]) == 1


async def test_snooze_hides_from_unread(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    note_id = await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])

    until = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    snoozed = await client.post(
        f"{API}/orgs/{org['id']}/notifications/{note_id}/snooze",
        json={"until": until},
        headers=auth["headers"],
    )
    assert snoozed.status_code == 200
    assert snoozed.json()["data"]["snoozed_until"] is not None

    unread = await client.get(f"{API}/orgs/{org['id']}/notifications", headers=auth["headers"])
    assert unread.json()["data"]["unread_count"] == 0
    assert unread.json()["data"]["items"] == []


async def test_snooze_in_past_rejected(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    note_id = await _seed_notification(org_id=org["id"], recipient_id=auth["user_id"])

    past = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    response = await client.post(
        f"{API}/orgs/{org['id']}/notifications/{note_id}/snooze",
        json={"until": past},
        headers=auth["headers"],
    )
    assert response.status_code == 400


async def test_assignment_emits_notification(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    member = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], member)
    project = await create_project(client, owner["headers"], org["id"], key="NTF")

    add_member = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": member["user_id"]},
        headers=owner["headers"],
    )
    assert add_member.status_code == 201

    task = await create_task(client, owner["headers"], org["id"], project["id"])
    updated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"assignee_id": member["user_id"]},
        headers=owner["headers"],
    )
    assert updated.status_code == 200

    listing = await client.get(f"{API}/orgs/{org['id']}/notifications", headers=member["headers"])
    types = [item["type"] for item in listing.json()["data"]["items"]]
    assert "assigned" in types
    assert "member_added" in types

    assigned = next(item for item in listing.json()["data"]["items"] if item["type"] == "assigned")
    assert assigned["actor_id"] == owner["user_id"]
    assert assigned["actor_name"] == "Test User"
    assert assigned["entity_id"] == task["id"]
    # The web link needs the parent project in its path to open the task.
    assert assigned["project_id"] == project["id"]

    member_added = next(
        item for item in listing.json()["data"]["items"] if item["type"] == "member_added"
    )
    assert member_added["project_id"] is None

    read = await client.post(
        f"{API}/orgs/{org['id']}/notifications/{assigned['id']}/read",
        headers=member["headers"],
    )
    assert read.status_code == 200
    assert read.json()["data"]["project_id"] == project["id"]


async def test_task_project_is_not_resolved_across_orgs(client: AsyncClient) -> None:
    """A notification never reports a project that belongs to another workspace."""
    auth = await register_and_login(client)
    home = await create_org(client, auth["headers"])
    other = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], other["id"], key="OTH")
    task = await create_task(client, auth["headers"], other["id"], project["id"])

    await _seed_notification(org_id=home["id"], recipient_id=auth["user_id"], entity_id=task["id"])

    listing = await client.get(f"{API}/orgs/{home['id']}/notifications", headers=auth["headers"])
    seeded = next(
        item for item in listing.json()["data"]["items"] if item["entity_id"] == task["id"]
    )
    assert seeded["project_id"] is None
