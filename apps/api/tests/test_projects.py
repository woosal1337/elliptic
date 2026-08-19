"""Project CRUD and member assignment tests."""

from httpx import AsyncClient

from tests.helpers import API, add_org_member, create_org, create_project, register_and_login


async def test_project_crud(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="CRUD")
    assert project["key"] == "CRUD"
    assert project["status"] == "active"

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"]
    )
    assert fetched.status_code == 200

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"name": "Renamed", "status": "archived"},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "Renamed"
    assert updated.json()["data"]["status"] == "archived"

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"]
    )
    assert deleted.status_code == 200
    gone = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"]
    )
    assert gone.status_code == 404


async def test_project_member_roles(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="ROL")
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member)
    member_me = (await client.get(f"{API}/users/me", headers=member["headers"])).json()["data"]

    added = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": member_me["id"], "role": "viewer"},
        headers=owner["headers"],
    )
    assert added.status_code == 201, added.text
    assert added.json()["data"]["role"] == "viewer"

    promoted = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members/{member_me['id']}",
        json={"role": "admin"},
        headers=owner["headers"],
    )
    assert promoted.status_code == 200, promoted.text
    assert promoted.json()["data"]["role"] == "admin"

    members = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members", headers=owner["headers"]
    )
    roles = {m["user_id"]: m["role"] for m in members.json()["data"]}
    assert roles[owner["user_id"]] == "admin"


async def test_project_browse_and_self_join(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    public = await create_project(client, owner["headers"], org["id"], key="PUB")
    private = await create_project(client, owner["headers"], org["id"], key="PRIV")
    await client.patch(
        f"{API}/orgs/{org['id']}/projects/{public['id']}",
        json={"network": "public"},
        headers=owner["headers"],
    )

    joiner = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], joiner)

    browse = await client.get(f"{API}/orgs/{org['id']}/projects/browse", headers=joiner["headers"])
    assert browse.status_code == 200, browse.text
    rows = browse.json()["data"]
    assert {row["key"] for row in rows} == {"PUB"}
    assert rows[0]["is_member"] is False
    assert rows[0]["member_count"] == 1

    forbidden = await client.post(
        f"{API}/orgs/{org['id']}/projects/{private['id']}/join", headers=joiner["headers"]
    )
    assert forbidden.status_code == 403

    joined = await client.post(
        f"{API}/orgs/{org['id']}/projects/{public['id']}/join", headers=joiner["headers"]
    )
    assert joined.status_code == 201, joined.text
    again = await client.get(f"{API}/orgs/{org['id']}/projects/browse", headers=joiner["headers"])
    assert again.json()["data"][0]["is_member"] is True
    assert again.json()["data"][0]["member_count"] == 2

    dup = await client.post(
        f"{API}/orgs/{org['id']}/projects/{public['id']}/join", headers=joiner["headers"]
    )
    assert dup.status_code == 409


async def test_project_labels(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="LBL")
    assert project["labels"] == []
    updated = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"labels": ["Internal", "Q3"]},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["labels"] == ["Internal", "Q3"]


async def test_project_icon(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="ICO")
    assert project["icon"] is None
    updated = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"icon": "🚀"},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["icon"] == "🚀"


async def test_project_default_assignee_autofills(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="DEF")

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"default_assignee_id": auth["user_id"]},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["default_assignee_id"] == auth["user_id"]

    task = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Auto-assigned"},
        headers=auth["headers"],
    )
    assert task.json()["data"]["assignee_id"] == auth["user_id"]


async def test_project_estimate_scale_and_task_estimate(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="EST")
    assert project["estimate_scale"] == []

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"estimate_scale": ["1", "2", "3", "5", "8"]},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["estimate_scale"] == ["1", "2", "3", "5", "8"]

    task = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Sized work"},
        headers=auth["headers"],
    )
    task_id = task.json()["data"]["id"]
    estimated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task_id}",
        json={"estimate": "5"},
        headers=auth["headers"],
    )
    assert estimated.status_code == 200
    assert estimated.json()["data"]["estimate"] == "5"


async def test_project_feature_toggles(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="FEAT")
    assert project["features"] == {}

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"features": {"notes": False, "meetings": True}},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["features"] == {"notes": False, "meetings": True}

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"]
    )
    assert fetched.json()["data"]["features"] == {"notes": False, "meetings": True}


async def test_duplicate_project_key_conflict(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    await create_project(client, auth["headers"], org["id"], key="DUPE")
    response = await client.post(
        f"{API}/orgs/{org['id']}/projects",
        json={"name": "Second", "key": "DUPE"},
        headers=auth["headers"],
    )
    assert response.status_code == 409


async def test_invalid_project_key_rejected(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/projects",
        json={"name": "Bad", "key": "bad1"},
        headers=auth["headers"],
    )
    assert response.status_code == 422


async def test_project_member_assignment(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    teammate = await register_and_login(client)
    outsider = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], teammate)
    project = await create_project(client, owner["headers"], org["id"], key="TEAM")

    added = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": teammate["user_id"]},
        headers=owner["headers"],
    )
    assert added.status_code == 201

    rejected = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": outsider["user_id"]},
        headers=owner["headers"],
    )
    assert rejected.status_code == 400

    members = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members", headers=owner["headers"]
    )
    user_ids = {row["user_id"] for row in members.json()["data"]}
    assert user_ids == {owner["user_id"], teammate["user_id"]}

    removed = await client.delete(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members/{teammate['user_id']}",
        headers=owner["headers"],
    )
    assert removed.status_code == 200
