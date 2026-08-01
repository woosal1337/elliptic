"""My Work user-scoped task endpoints: assigned/created/subscribed/recent (BT-13)."""

from httpx import AsyncClient

from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def test_assigned_spans_projects_and_excludes_others(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    member_id = member["user_id"]
    project_a = await create_project(client, owner["headers"], org["id"], key="AAA")
    project_b = await create_project(client, owner["headers"], org["id"], key="BBB")
    for project in (project_a, project_b):
        await client.post(
            f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
            json={"user_id": member_id},
            headers=owner["headers"],
        )
    mine_a = await create_task(
        client, owner["headers"], org["id"], project_a["id"], title="Mine A", assignee_id=member_id
    )
    mine_b = await create_task(
        client, owner["headers"], org["id"], project_b["id"], title="Mine B", assignee_id=member_id
    )
    await create_task(client, owner["headers"], org["id"], project_a["id"], title="Not mine")

    response = await client.get(f"{API}/orgs/{org['id']}/tasks/assigned", headers=member["headers"])
    assert response.status_code == 200, response.text
    ids = {item["id"] for item in response.json()["data"]["items"]}
    assert ids == {mine_a["id"], mine_b["id"]}


async def test_all_lists_every_task_in_the_org(client: AsyncClient) -> None:
    """The shared list shows a member work they neither own nor created."""
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    project = await create_project(client, owner["headers"], org["id"], key="ALL")
    someone_elses = await create_task(
        client, owner["headers"], org["id"], project["id"], title="Owner's task"
    )

    assigned = await client.get(
        f"{API}/orgs/{org['id']}/tasks/assigned", headers=member["headers"]
    )
    assert someone_elses["id"] not in {i["id"] for i in assigned.json()["data"]["items"]}

    response = await client.get(f"{API}/orgs/{org['id']}/tasks/all", headers=member["headers"])
    assert response.status_code == 200, response.text
    assert someone_elses["id"] in {i["id"] for i in response.json()["data"]["items"]}


async def test_created_lists_tasks_the_user_authored(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="CRE")
    made = await create_task(client, auth["headers"], org["id"], project["id"], title="Authored")
    response = await client.get(f"{API}/orgs/{org['id']}/tasks/created", headers=auth["headers"])
    ids = {item["id"] for item in response.json()["data"]["items"]}
    assert made["id"] in ids


async def test_subscribed_reflects_watching(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="SUB")
    watched = await create_task(client, auth["headers"], org["id"], project["id"], title="Watched")
    other = await create_task(client, auth["headers"], org["id"], project["id"], title="Other")
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{other['id']}/unsubscribe", headers=auth["headers"]
    )
    response = await client.get(f"{API}/orgs/{org['id']}/tasks/subscribed", headers=auth["headers"])
    ids = {item["id"] for item in response.json()["data"]["items"]}
    assert watched["id"] in ids
    assert other["id"] not in ids


async def test_recent_unions_relationships_and_excludes_triage(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="REC")
    normal = await create_task(client, auth["headers"], org["id"], project["id"], title="Normal")
    triaged = await create_task(
        client, auth["headers"], org["id"], project["id"], title="Triaged", is_triage=True
    )
    response = await client.get(f"{API}/orgs/{org['id']}/tasks/recent", headers=auth["headers"])
    ids = {item["id"] for item in response.json()["data"]["items"]}
    assert normal["id"] in ids
    assert triaged["id"] not in ids


async def test_my_tasks_routes_do_not_shadow_task_detail(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="SHD")
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="Detail")
    detail = await client.get(f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=auth["headers"])
    assert detail.status_code == 200, detail.text
    assert detail.json()["data"]["id"] == task["id"]
