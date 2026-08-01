"""Per-project lifecycle automation: auto-archive + auto-close (COS-218)."""

import uuid
from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select, update

from elliptic.core import jobs
from elliptic.core.database import session_factory
from elliptic.modules.tasks.models import Task, TaskStatus
from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def _backdate(task_id: str, days: int) -> None:
    async with session_factory() as session:
        await session.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task_id))
            .values(updated_at=datetime.now(UTC) - timedelta(days=days))
        )
        await session.commit()


async def test_project_lifecycle_auto_archive_and_close(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])

    configured = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"auto_archive_days": 30, "auto_close_days": 14, "auto_close_status": "cancelled"},
        headers=auth["headers"],
    )
    assert configured.status_code == 200, configured.text
    assert configured.json()["data"]["auto_close_status"] == "cancelled"

    done = await create_task(client, auth["headers"], org["id"], project["id"], title="Old done")
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{done['id']}/status",
        json={"status": "done"},
        headers=auth["headers"],
    )
    await _backdate(done["id"], 40)

    stale = await create_task(client, auth["headers"], org["id"], project["id"], title="Stale")
    await _backdate(stale["id"], 20)

    fresh = await create_task(client, auth["headers"], org["id"], project["id"], title="Fresh")

    affected = 0
    async with session_factory() as session:
        affected = await jobs.apply_project_lifecycle(session)
    assert affected == 2

    done_after = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{done['id']}", headers=auth["headers"]
    )
    assert done_after.json()["data"]["archived_at"] is not None

    stale_after = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{stale['id']}", headers=auth["headers"]
    )
    assert stale_after.json()["data"]["status"] == "cancelled"

    fresh_after = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{fresh['id']}", headers=auth["headers"]
    )
    assert fresh_after.json()["data"]["status"] == "backlog"
    assert fresh_after.json()["data"]["archived_at"] is None


async def test_lifecycle_skips_unconfigured_projects(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    await _backdate(task["id"], 400)

    async with session_factory() as session:
        assert await jobs.apply_project_lifecycle(session) == 0
        row = await session.scalar(select(Task).where(Task.id == uuid.UUID(task["id"])))
        assert row is not None
        assert row.status == TaskStatus.BACKLOG
