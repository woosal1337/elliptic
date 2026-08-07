"""Triage queue: flag, default-view exclusion, accept, and decline (TRI-01)."""

from httpx import AsyncClient

from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def _setup(client: AsyncClient) -> tuple[dict[str, str], str, str]:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="TRI")
    return auth["headers"], org["id"], project["id"]


async def test_triage_count_badge(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    base = f"{API}/orgs/{org_id}"

    assert (await client.get(f"{base}/triage/count", headers=headers)).json()["data"]["total"] == 0

    a = await create_task(client, headers, org_id, project_id, title="A", is_triage=True)
    await create_task(client, headers, org_id, project_id, title="B", is_triage=True)
    count = (await client.get(f"{base}/triage/count", headers=headers)).json()["data"]
    assert count["total"] == 2
    assert count["by_project"][project_id] == 2

    await client.post(f"{base}/tasks/{a['id']}/triage/decline", json={}, headers=headers)
    assert (await client.get(f"{base}/triage/count", headers=headers)).json()["data"]["total"] == 1


async def test_intake_owner_auto_assigns_triage(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="TRI")
    headers, org_id, project_id = auth["headers"], org["id"], project["id"]

    # The intake owner is deliberately someone other than the creator, so the
    # triage task and the normal one can't both be explained by one rule.
    owner = await register_and_login(client)
    await add_org_member(client, headers, org_id, owner)
    await client.post(
        f"{API}/orgs/{org_id}/projects/{project_id}/members",
        json={"user_id": owner["user_id"], "role": "member"},
        headers=headers,
    )
    set_owner = await client.patch(
        f"{API}/orgs/{org_id}/projects/{project_id}",
        json={"intake_owner_id": owner["user_id"]},
        headers=headers,
    )
    assert set_owner.status_code == 200, set_owner.text
    assert set_owner.json()["data"]["intake_owner_id"] == owner["user_id"]

    triaged = await create_task(
        client, headers, org_id, project_id, title="Inbound", is_triage=True
    )
    assert triaged["assignee_id"] == owner["user_id"]

    normal = await create_task(client, headers, org_id, project_id, title="Normal")
    assert normal["assignee_id"] == auth["user_id"]


async def test_accept_with_chosen_status(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    triaged = await create_task(client, headers, org_id, project_id, title="Bug", is_triage=True)
    accepted = await client.post(
        f"{API}/orgs/{org_id}/tasks/{triaged['id']}/triage/accept",
        json={"status": "in_progress"},
        headers=headers,
    )
    assert accepted.status_code == 200, accepted.text
    data = accepted.json()["data"]
    assert data["is_triage"] is False
    assert data["status"] == "in_progress"


async def test_snooze_removes_then_resurfaces(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    triaged = await create_task(client, headers, org_id, project_id, title="Later", is_triage=True)

    snoozed = await client.post(
        f"{API}/orgs/{org_id}/tasks/{triaged['id']}/triage/snooze",
        json={"snoozed_till": "2999-01-01T00:00:00Z"},
        headers=headers,
    )
    assert snoozed.status_code == 200, snoozed.text

    queue = await client.get(f"{API}/orgs/{org_id}/triage", headers=headers)
    ids = [task["id"] for task in queue.json()["data"]]
    assert triaged["id"] not in ids

    await client.post(
        f"{API}/orgs/{org_id}/tasks/{triaged['id']}/triage/snooze",
        json={"snoozed_till": "2000-01-01T00:00:00Z"},
        headers=headers,
    )
    queue2 = await client.get(f"{API}/orgs/{org_id}/triage", headers=headers)
    ids2 = [task["id"] for task in queue2.json()["data"]]
    assert triaged["id"] in ids2


async def test_mark_duplicate_links_original(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    original = await create_task(client, headers, org_id, project_id, title="Original")
    dupe = await create_task(client, headers, org_id, project_id, title="Dupe", is_triage=True)
    marked = await client.post(
        f"{API}/orgs/{org_id}/tasks/{dupe['id']}/triage/duplicate",
        json={"duplicate_of": original["id"]},
        headers=headers,
    )
    assert marked.status_code == 200, marked.text
    data = marked.json()["data"]
    assert data["is_triage"] is False
    assert data["status"] == "duplicate"

    relations = await client.get(
        f"{API}/orgs/{org_id}/tasks/{dupe['id']}/relations", headers=headers
    )
    kinds = {row["type"] for row in relations.json()["data"]}
    assert "duplicate" in kinds


async def test_triage_task_is_excluded_from_default_views(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    normal = await create_task(client, headers, org_id, project_id, title="Normal")
    triaged = await create_task(
        client, headers, org_id, project_id, title="From AI", is_triage=True
    )
    assert triaged["is_triage"] is True

    listing = await client.get(f"{API}/orgs/{org_id}/projects/{project_id}/tasks", headers=headers)
    ids = {item["id"] for item in listing.json()["data"]["items"]}
    assert normal["id"] in ids
    assert triaged["id"] not in ids

    board = await client.get(
        f"{API}/orgs/{org_id}/projects/{project_id}/tasks/board", headers=headers
    )
    board_ids = {task["id"] for column in board.json()["data"] for task in column["tasks"]}
    assert triaged["id"] not in board_ids

    triage = await client.get(f"{API}/orgs/{org_id}/triage", headers=headers)
    triage_ids = {item["id"] for item in triage.json()["data"]}
    assert triage_ids == {triaged["id"]}


async def test_accept_moves_task_into_the_active_board(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    triaged = await create_task(
        client, headers, org_id, project_id, title="From AI", is_triage=True
    )
    response = await client.post(
        f"{API}/orgs/{org_id}/tasks/{triaged['id']}/triage/accept", headers=headers
    )
    assert response.status_code == 200, response.text
    accepted = response.json()["data"]
    assert accepted["is_triage"] is False
    assert accepted["status"] == "todo"

    listing = await client.get(f"{API}/orgs/{org_id}/projects/{project_id}/tasks", headers=headers)
    ids = {item["id"] for item in listing.json()["data"]["items"]}
    assert triaged["id"] in ids

    triage = await client.get(f"{API}/orgs/{org_id}/triage", headers=headers)
    assert triage.json()["data"] == []


async def test_decline_cancels_the_task(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    triaged = await create_task(client, headers, org_id, project_id, title="Spam", is_triage=True)
    response = await client.post(
        f"{API}/orgs/{org_id}/tasks/{triaged['id']}/triage/decline",
        json={"reason": "duplicate of TRI-1"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    declined = response.json()["data"]
    assert declined["status"] == "cancelled"
    assert declined["triage_resolved_at"] is not None

    triage = await client.get(f"{API}/orgs/{org_id}/triage", headers=headers)
    assert triage.json()["data"] == []
    closed = await client.get(f"{API}/orgs/{org_id}/triage?resolved=true", headers=headers)
    assert {item["id"] for item in closed.json()["data"]} == {triaged["id"]}


async def test_accept_requires_a_triage_task(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    normal = await create_task(client, headers, org_id, project_id, title="Normal")
    response = await client.post(
        f"{API}/orgs/{org_id}/tasks/{normal['id']}/triage/accept", headers=headers
    )
    assert response.status_code == 400, response.text
