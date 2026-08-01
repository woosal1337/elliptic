"""Live-sync tests: the in-process broker and the Postgres NOTIFY bridge."""

import asyncio
import uuid

from httpx import AsyncClient

from elliptic.core.realtime import ActivityBroker, broker
from tests.helpers import create_org, create_project, register_and_login


async def test_broker_isolates_organizations() -> None:
    local_broker = ActivityBroker()
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    queue_a = local_broker.subscribe(org_a)

    local_broker.publish(org_a, {"org_id": str(org_a), "entity_type": "task"})
    local_broker.publish(org_b, {"org_id": str(org_b), "entity_type": "task"})

    assert queue_a.qsize() == 1
    event = await queue_a.get()
    assert event["org_id"] == str(org_a)


async def test_broker_drops_oldest_when_full() -> None:
    local_broker = ActivityBroker()
    org = uuid.uuid4()
    queue = local_broker.subscribe(org)
    for index in range(150):
        local_broker.publish(org, {"org_id": str(org), "n": index})
    assert queue.qsize() <= 100


async def test_activity_notify_reaches_broker(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    org_id = uuid.UUID(org["id"])
    queue = broker.subscribe(org_id)
    try:
        await create_project(client, auth["headers"], org["id"])
        received: list[dict[str, object]] = []
        async with asyncio.timeout(10):
            while not any(event.get("entity_type") == "project" for event in received):
                received.append(await queue.get())
        project_events = [event for event in received if event.get("entity_type") == "project"]
        assert project_events
        assert all(event["org_id"] == org["id"] for event in project_events)
    finally:
        broker.unsubscribe(org_id, queue)
