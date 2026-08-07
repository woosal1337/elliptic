"""Declarative transition conditions (COS-220)."""

from httpx import AsyncClient

from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def test_require_assignee_condition_blocks_move(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="TCD")
    statuses = (await client.get(f"{API}/orgs/{org['id']}/workflow/statuses", headers=h)).json()[
        "data"
    ]
    by_name = {s["name"]: s["id"] for s in statuses}

    created = await client.post(
        f"{API}/orgs/{org['id']}/workflow/conditions",
        json={
            "from_status_id": by_name["Backlog"],
            "to_status_id": by_name["In Progress"],
            "condition": "require_assignee",
        },
        headers=h,
    )
    assert created.status_code == 201, created.text

    task = await create_task(client, h, org["id"], project["id"], unassigned=True)
    me_id = auth["user_id"]

    blocked = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=h,
    )
    assert blocked.status_code == 400, blocked.text
    assert "assignee" in blocked.json()["message"].lower()

    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"assignee_id": me_id},
        headers=h,
    )
    ok_move = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=h,
    )
    assert ok_move.status_code == 200, ok_move.text
