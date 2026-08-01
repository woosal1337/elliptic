"""Urgent-priority auto-notify to the assignee (NOTI-BE-01)."""

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


async def test_marking_urgent_notifies_the_assignee(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    member_id = member["user_id"]
    project = await create_project(client, owner["headers"], org["id"], key="URG")
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": member_id},
        headers=owner["headers"],
    )
    task = await create_task(
        client, owner["headers"], org["id"], project["id"], title="Ship it", assignee_id=member_id
    )

    response = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"priority": "urgent"},
        headers=owner["headers"],
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["priority"] == "urgent"

    async with session_factory() as session:
        urgent = (
            await session.scalars(
                select(Notification).where(
                    Notification.recipient_id == uuid.UUID(member_id),
                    Notification.type == NotificationType.URGENT,
                )
            )
        ).all()
    assert len(urgent) == 1
    assert urgent[0].entity_id is not None


async def test_self_marking_urgent_does_not_notify(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SLF")
    task = await create_task(
        client,
        owner["headers"],
        org["id"],
        project["id"],
        title="Mine",
        assignee_id=owner["user_id"],
    )
    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"priority": "urgent"},
        headers=owner["headers"],
    )
    async with session_factory() as session:
        urgent = (
            await session.scalars(
                select(Notification).where(Notification.type == NotificationType.URGENT)
            )
        ).all()
    assert urgent == []
