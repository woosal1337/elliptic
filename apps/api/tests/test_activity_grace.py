"""Creation grace period suppression in the task activity feed (SAFE-05)."""

import uuid
from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy import update

from elliptic.core.database import session_factory
from elliptic.core.models_base import utcnow
from elliptic.modules.tasks.models import Task
from elliptic.modules.tasks.service import CREATION_GRACE_SECONDS
from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def _task_events(
    client: AsyncClient, headers: dict[str, str], org_id: str, task_id: str
) -> list[dict[str, object]]:
    response = await client.get(f"{API}/orgs/{org_id}/activity/task/{task_id}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()["data"]["items"]


async def _backdate_created_at(task_id: str, seconds: int) -> None:
    async with session_factory() as session:
        await session.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task_id))
            .values(created_at=utcnow() - timedelta(seconds=seconds))
        )
        await session.commit()


async def test_edits_within_grace_are_suppressed(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])

    patch = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"title": "Renamed", "priority": "high"},
        headers=auth["headers"],
    )
    assert patch.status_code == 200, patch.text

    transition = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=auth["headers"],
    )
    assert transition.status_code == 200, transition.text

    events = await _task_events(client, auth["headers"], org["id"], task["id"])
    event_types = [event["event_type"] for event in events]
    assert event_types == ["created"]


async def test_grace_suppresses_activity_but_persists_state(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])

    patch = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"title": "Renamed within grace"},
        headers=auth["headers"],
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["data"]["title"] == "Renamed within grace"

    events = await _task_events(client, auth["headers"], org["id"], task["id"])
    assert [event["event_type"] for event in events] == ["created"]


async def test_edits_after_grace_are_logged(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])

    await _backdate_created_at(task["id"], CREATION_GRACE_SECONDS + 60)

    patch = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"title": "Renamed after grace", "priority": "high"},
        headers=auth["headers"],
    )
    assert patch.status_code == 200, patch.text

    transition = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=auth["headers"],
    )
    assert transition.status_code == 200, transition.text

    events = await _task_events(client, auth["headers"], org["id"], task["id"])
    event_types = {event["event_type"] for event in events}
    assert "created" in event_types
    assert "updated" in event_types
    assert "status_changed" in event_types
