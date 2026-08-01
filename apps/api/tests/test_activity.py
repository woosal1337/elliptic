"""Activity feed tests."""

import uuid

from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.activity.service import record_activity
from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def test_org_feed_collects_mutations(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    await create_task(client, auth["headers"], org["id"], project["id"])

    feed = await client.get(f"{API}/orgs/{org['id']}/activity", headers=auth["headers"])
    assert feed.status_code == 200
    data = feed.json()["data"]
    pairs = {(event["entity_type"], event["event_type"]) for event in data["items"]}
    assert ("organization", "created") in pairs
    assert ("project", "created") in pairs
    assert ("task", "created") in pairs

    paged = await client.get(
        f"{API}/orgs/{org['id']}/activity", params={"limit": 1}, headers=auth["headers"]
    )
    assert len(paged.json()["data"]["items"]) == 1
    assert paged.json()["data"]["total"] == data["total"]


async def test_record_activity_persists_project_id(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])

    entity_id = uuid.uuid4()
    async with session_factory() as session:
        await record_activity(
            session,
            org_id=uuid.UUID(org["id"]),
            entity_type="task",
            entity_id=entity_id,
            event_type="created",
            project_id=uuid.UUID(project["id"]),
        )
        await session.commit()

    async with session_factory() as session:
        event = await session.scalar(
            select(ActivityEvent).where(ActivityEvent.entity_id == entity_id)
        )
    assert event is not None
    assert str(event.project_id) == project["id"]
