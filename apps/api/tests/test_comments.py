"""Comment tests including cross-org target verification."""

import uuid

from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.modules.notifications.models import Notification, NotificationType
from elliptic.modules.tasks.models import TaskSubscription
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def test_comment_mention_notifies_and_subscribes(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    project = await create_project(client, owner["headers"], org["id"])
    task = await create_task(client, owner["headers"], org["id"], project["id"])

    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "task",
            "entity_id": task["id"],
            "content": "cc you",
            "mention_user_ids": [member["user_id"]],
        },
        headers=owner["headers"],
    )
    assert created.status_code == 201, created.text

    async with session_factory() as session:
        notifs = list(
            await session.scalars(
                select(Notification).where(
                    Notification.recipient_id == uuid.UUID(member["user_id"]),
                    Notification.type == NotificationType.MENTIONED,
                    Notification.entity_type == "task",
                )
            )
        )
        assert len(notifs) == 1
        subs = list(
            await session.scalars(
                select(TaskSubscription).where(
                    TaskSubscription.task_id == uuid.UUID(task["id"]),
                    TaskSubscription.user_id == uuid.UUID(member["user_id"]),
                )
            )
        )
        assert len(subs) == 1


async def test_comment_edit_history(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "First draft"},
        headers=auth["headers"],
    )
    comment_id = created.json()["data"]["id"]
    assert created.json()["data"]["edited_at"] is None

    edited = await client.patch(
        f"{API}/orgs/{org['id']}/comments/{comment_id}",
        json={"content": "Second draft"},
        headers=auth["headers"],
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["data"]["edited_at"] is not None
    assert edited.json()["data"]["content"] == "Second draft"

    versions = await client.get(
        f"{API}/orgs/{org['id']}/comments/{comment_id}/versions", headers=auth["headers"]
    )
    assert versions.status_code == 200, versions.text
    rows = versions.json()["data"]
    assert len(rows) == 1
    assert rows[0]["content"] == "First draft"


async def test_comment_on_task(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "Looks good"},
        headers=auth["headers"],
    )
    assert created.status_code == 201
    listing = await client.get(
        f"{API}/orgs/{org['id']}/comments",
        params={"entity_type": "task", "entity_id": task["id"]},
        headers=auth["headers"],
    )
    data = listing.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["content"] == "Looks good"

    feed = await client.get(
        f"{API}/orgs/{org['id']}/activity/task/{task['id']}", headers=auth["headers"]
    )
    event_types = [event["event_type"] for event in feed.json()["data"]["items"]]
    assert "commented" in event_types


async def test_comment_reaction_toggle(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "Nice"},
        headers=auth["headers"],
    )
    comment_id = created.json()["data"]["id"]

    add = await client.post(
        f"{API}/orgs/{org['id']}/comments/{comment_id}/reactions",
        json={"emoji": "👍"},
        headers=auth["headers"],
    )
    assert add.status_code == 200, add.text
    summary = add.json()["data"]
    assert summary == [{"emoji": "👍", "count": 1, "reacted": True}]

    listing = await client.get(
        f"{API}/orgs/{org['id']}/comments",
        params={"entity_type": "task", "entity_id": task["id"]},
        headers=auth["headers"],
    )
    assert listing.json()["data"]["items"][0]["reactions"] == [
        {"emoji": "👍", "count": 1, "reacted": True}
    ]

    remove = await client.post(
        f"{API}/orgs/{org['id']}/comments/{comment_id}/reactions",
        json={"emoji": "👍"},
        headers=auth["headers"],
    )
    assert remove.json()["data"] == []


async def test_comment_resolve_toggle(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "Needs a look"},
        headers=auth["headers"],
    )
    comment_id = created.json()["data"]["id"]
    assert created.json()["data"]["resolved_at"] is None

    resolved = await client.post(
        f"{API}/orgs/{org['id']}/comments/{comment_id}/resolve",
        json={"resolved": True},
        headers=auth["headers"],
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["data"]["resolved_at"] is not None

    reopened = await client.post(
        f"{API}/orgs/{org['id']}/comments/{comment_id}/resolve",
        json={"resolved": False},
        headers=auth["headers"],
    )
    assert reopened.status_code == 200
    assert reopened.json()["data"]["resolved_at"] is None


async def test_comment_threaded_reply(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    parent = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "Top comment"},
        headers=auth["headers"],
    )
    parent_id = parent.json()["data"]["id"]
    assert parent.json()["data"]["parent_id"] is None

    reply = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "task",
            "entity_id": task["id"],
            "content": "A reply",
            "parent_id": parent_id,
        },
        headers=auth["headers"],
    )
    assert reply.status_code == 201, reply.text
    reply_id = reply.json()["data"]["id"]
    assert reply.json()["data"]["parent_id"] == parent_id

    nested = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "task",
            "entity_id": task["id"],
            "content": "Reply to a reply",
            "parent_id": reply_id,
        },
        headers=auth["headers"],
    )
    assert nested.status_code == 403


async def test_comment_on_missing_entity_404(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    other = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    other_org = await create_org(client, other["headers"])
    project = await create_project(client, other["headers"], other_org["id"])
    foreign_task = await create_task(client, other["headers"], other_org["id"], project["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": foreign_task["id"], "content": "leak"},
        headers=auth["headers"],
    )
    assert response.status_code == 404


async def test_comment_edit_permissions(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    member = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], member)
    project = await create_project(client, owner["headers"], org["id"])
    task = await create_task(client, owner["headers"], org["id"], project["id"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "Owner says"},
        headers=owner["headers"],
    )
    comment_id = created.json()["data"]["id"]

    forbidden = await client.patch(
        f"{API}/orgs/{org['id']}/comments/{comment_id}",
        json={"content": "member edit"},
        headers=member["headers"],
    )
    assert forbidden.status_code == 403

    allowed = await client.patch(
        f"{API}/orgs/{org['id']}/comments/{comment_id}",
        json={"content": "owner edit"},
        headers=owner["headers"],
    )
    assert allowed.status_code == 200

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/comments/{comment_id}", headers=owner["headers"]
    )
    assert deleted.status_code == 200
