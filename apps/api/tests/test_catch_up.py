"""Catch-up digest of unread notifications (COS-161)."""

import uuid

from httpx import AsyncClient

from elliptic.core.database import session_factory
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from tests.helpers import API, create_org, register_and_login


async def _seed(org_id: str, recipient_id: str, entity_id: str, title: str) -> None:
    async with session_factory() as session:
        await notify(
            session,
            org_id=uuid.UUID(org_id),
            recipient_id=uuid.UUID(recipient_id),
            type=NotificationType.MENTIONED,
            entity_type="task",
            entity_id=uuid.UUID(entity_id),
            actor_id=None,
            title=title,
            snippet="snippet",
        )
        await session.commit()


async def test_catch_up_groups_unread(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    me = auth["user_id"]
    org = await create_org(client, auth["headers"])
    task_a = str(uuid.uuid4())
    task_b = str(uuid.uuid4())

    await _seed(org["id"], me, task_a, "Update on A")
    await _seed(org["id"], me, task_a, "Another update on A")
    await _seed(org["id"], me, task_b, "Update on B")

    res = await client.get(
        f"{API}/orgs/{org['id']}/notifications/catch-up", headers=auth["headers"]
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["total_unread"] == 3
    assert data["by_type"]["mentioned"] == 3
    counts = {g["entity_id"]: g["count"] for g in data["groups"]}
    assert counts[task_a] == 2
    assert counts[task_b] == 1
