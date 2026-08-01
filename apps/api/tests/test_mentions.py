"""Mentions → relations + subscriptions/notifications, text-to-tasks (NOTE-01/02, TRI-03)."""

import uuid

from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.modules.notifications.models import Notification, NotificationType
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def _mention_notifications(recipient_id: str, entity_type: str) -> list[Notification]:
    async with session_factory() as session:
        rows = await session.scalars(
            select(Notification).where(
                Notification.recipient_id == uuid.UUID(recipient_id),
                Notification.type == NotificationType.MENTIONED,
                Notification.entity_type == entity_type,
            )
        )
        return list(rows)


async def test_task_mention_links_relation_and_notifies(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    project = await create_project(client, owner["headers"], org["id"], key="MEN")
    other = await create_task(client, owner["headers"], org["id"], project["id"], title="Other")

    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={
            "title": "Mentions Bob, links Other",
            "mention_user_ids": [member["user_id"]],
            "related_task_ids": [other["id"]],
        },
        headers=owner["headers"],
    )
    assert created.status_code == 201, created.text
    task_id = created.json()["data"]["id"]

    relations = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task_id}/relations", headers=owner["headers"]
    )
    related = relations.json()["data"]
    assert any(r["task_id"] == other["id"] and r["type"] == "related" for r in related)

    notes = await _mention_notifications(member["user_id"], "task")
    assert len(notes) == 1


async def test_note_mention_notifies(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    response = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Plan", "content": "cc @bob", "mention_user_ids": [member["user_id"]]},
        headers=owner["headers"],
    )
    assert response.status_code == 201, response.text
    notes = await _mention_notifications(member["user_id"], "note")
    assert len(notes) == 1


async def test_batch_create_tasks_with_source_note(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="BAT")
    note = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Action items", "content": "- ship\n- test"},
        headers=auth["headers"],
    )
    note_id = note.json()["data"]["id"]
    response = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks/batch",
        json={"titles": ["Ship it", "  ", "Write tests"], "source_note_id": note_id},
        headers=auth["headers"],
    )
    assert response.status_code == 201, response.text
    tasks = response.json()["data"]
    assert [t["title"] for t in tasks] == ["Ship it", "Write tests"]
    assert all(t["source_note_id"] == note_id for t in tasks)
