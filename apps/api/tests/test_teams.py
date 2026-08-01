"""Team creation, rename, and conflict-handling tests."""

import uuid

from httpx import AsyncClient
from sqlalchemy import update

from elliptic.core.database import session_factory
from elliptic.modules.projects.models import Project
from tests.helpers import (
    API,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def test_team_stats_rollup(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/teams", json={"name": "Platform"}, headers=auth["headers"]
    )
    team = created.json()["data"]
    project = await create_project(client, auth["headers"], org["id"], key="TMS")
    async with session_factory() as scoped:
        await scoped.execute(
            update(Project)
            .where(Project.id == uuid.UUID(project["id"]))
            .values(team_id=uuid.UUID(team["id"]))
        )
        await scoped.commit()
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="A")
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=auth["headers"],
    )

    stats = await client.get(
        f"{API}/orgs/{org['id']}/teams/{team['id']}/stats", headers=auth["headers"]
    )
    assert stats.status_code == 200, stats.text
    data = stats.json()["data"]
    assert data["project_count"] == 1
    assert data["task_total"] == 1
    assert data["task_done"] == 1


async def test_create_team_and_list(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/teams", json={"name": "Platform"}, headers=owner["headers"]
    )
    assert created.status_code == 201, created.text
    listing = await client.get(f"{API}/orgs/{org['id']}/teams", headers=owner["headers"])
    assert listing.status_code == 200
    assert [team["name"] for team in listing.json()["data"]] == ["Platform"]


async def test_rename_team_conflict_returns_409(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    first = await client.post(
        f"{API}/orgs/{org['id']}/teams", json={"name": "Platform"}, headers=owner["headers"]
    )
    assert first.status_code == 201, first.text
    second = await client.post(
        f"{API}/orgs/{org['id']}/teams", json={"name": "Growth"}, headers=owner["headers"]
    )
    assert second.status_code == 201, second.text
    second_id = second.json()["data"]["id"]
    conflict = await client.patch(
        f"{API}/orgs/{org['id']}/teams/{second_id}",
        json={"name": "Platform"},
        headers=owner["headers"],
    )
    assert conflict.status_code == 409
