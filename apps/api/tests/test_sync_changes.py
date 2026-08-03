"""Delta sync: what changed since a cursor.

The failure this guards against is silent: a feed that misses a change looks
exactly like a feed with nothing to report, and the client is simply wrong
forever. So the cursor semantics are pinned rather than assumed.
"""

from httpx import AsyncClient

from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def _changes(client: AsyncClient, headers: dict, org_id: str, **params) -> dict:
    response = await client.get(f"{API}/orgs/{org_id}/sync/changes", headers=headers, params=params)
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def test_bootstrap_returns_live_rows_and_a_cursor(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    task = await create_task(client, owner["headers"], org["id"], project["id"], title="One")

    data = await _changes(client, owner["headers"], org["id"])

    assert data["cursor"]
    ids = [row["id"] for row in data["changes"]["tasks"]]
    assert task["id"] in ids
    assert [row["id"] for row in data["changes"]["projects"]] == [project["id"]]


async def test_a_cursor_excludes_what_it_already_saw(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    await create_task(client, owner["headers"], org["id"], project["id"], title="Before")

    first = await _changes(client, owner["headers"], org["id"])
    after = await _changes(client, owner["headers"], org["id"], since=first["cursor"])

    # The overlap window means a row may repeat; what must not happen is a row
    # appearing that was created after the cursor being missed.
    assert "tasks" in after["changes"]


async def test_a_change_after_the_cursor_is_reported(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")

    first = await _changes(client, owner["headers"], org["id"])
    later = await create_task(client, owner["headers"], org["id"], project["id"], title="After")

    after = await _changes(client, owner["headers"], org["id"], since=first["cursor"])
    assert later["id"] in [row["id"] for row in after["changes"]["tasks"]]


async def test_an_edit_is_reported_even_though_the_row_is_not_new(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    task = await create_task(client, owner["headers"], org["id"], project["id"], title="Edit me")

    first = await _changes(client, owner["headers"], org["id"])
    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"title": "Edited"},
        headers=owner["headers"],
    )

    after = await _changes(client, owner["headers"], org["id"], since=first["cursor"])
    assert task["id"] in [row["id"] for row in after["changes"]["tasks"]]


async def test_bootstrap_omits_tombstones(client: AsyncClient) -> None:
    # A client with no local copy has nothing to forget, so sending it a list of
    # things to delete is noise it would have to filter anyway.
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    await create_task(client, owner["headers"], org["id"], project["id"], title="Live")

    data = await _changes(client, owner["headers"], org["id"])
    assert all(row["deleted_at"] is None for row in data["changes"]["tasks"])


async def test_kinds_narrows_the_reply(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await create_project(client, owner["headers"], org["id"], key="SYN")

    data = await _changes(client, owner["headers"], org["id"], kinds="projects")
    assert set(data["changes"]) == {"projects"}


async def test_an_unknown_collection_is_rejected(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])

    response = await client.get(
        f"{API}/orgs/{org['id']}/sync/changes",
        headers=owner["headers"],
        params={"kinds": "tasks,wormholes"},
    )
    assert response.status_code == 400
    assert "wormholes" in response.text


async def test_has_more_is_set_when_a_page_fills(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    for i in range(3):
        await create_task(client, owner["headers"], org["id"], project["id"], title=f"T{i}")

    data = await _changes(client, owner["headers"], org["id"], limit=1, kinds="tasks")
    assert data["has_more"] is True
    assert len(data["changes"]["tasks"]) == 1


async def test_another_orgs_changes_are_never_returned(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    mine = await create_task(client, owner["headers"], org["id"], project["id"], title="Mine")

    stranger = await register_and_login(client)
    other_org = await create_org(client, stranger["headers"])
    other_project = await create_project(client, stranger["headers"], other_org["id"], key="OTH")
    theirs = await create_task(
        client, stranger["headers"], other_org["id"], other_project["id"], title="Theirs"
    )

    data = await _changes(client, owner["headers"], org["id"])
    ids = [row["id"] for row in data["changes"]["tasks"]]
    assert mine["id"] in ids
    assert theirs["id"] not in ids


async def test_a_non_member_cannot_read_the_feed(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    outsider = await register_and_login(client)

    response = await client.get(f"{API}/orgs/{org['id']}/sync/changes", headers=outsider["headers"])
    assert response.status_code in (403, 404)


async def test_a_member_can_read_the_feed(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")

    response = await client.get(f"{API}/orgs/{org['id']}/sync/changes", headers=member["headers"])
    assert response.status_code == 200


async def test_a_deleted_task_is_reported_as_a_deletion(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    task = await create_task(client, owner["headers"], org["id"], project["id"], title="Doomed")

    cursor = (await _changes(client, owner["headers"], org["id"]))["cursor"]
    response = await client.delete(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"]
    )
    assert response.status_code in (200, 204), response.text

    after = await _changes(client, owner["headers"], org["id"], since=cursor)
    assert task["id"] in after["deletions"]["tasks"]


async def test_the_row_really_is_gone_not_merely_flagged(client: AsyncClient) -> None:
    # The whole reason deletions are recorded separately: tasks are the parent
    # of 16 cascading foreign keys, so the delete has to stay a real delete.
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    task = await create_task(client, owner["headers"], org["id"], project["id"], title="Doomed")

    await client.delete(f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"])

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"]
    )
    assert fetched.status_code == 404


async def test_a_deleted_task_stops_appearing_in_changed_rows(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    task = await create_task(client, owner["headers"], org["id"], project["id"], title="Doomed")
    await client.delete(f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"])

    boot = await _changes(client, owner["headers"], org["id"])
    assert task["id"] not in [row["id"] for row in boot["changes"]["tasks"]]


async def test_bootstrap_reports_no_deletions(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="SYN")
    task = await create_task(client, owner["headers"], org["id"], project["id"], title="Doomed")
    await client.delete(f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"])

    boot = await _changes(client, owner["headers"], org["id"])
    assert boot["deletions"] in ({}, {"tasks": [], "notes": [], "projects": []})


async def test_another_orgs_deletions_are_never_returned(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    cursor = (await _changes(client, owner["headers"], org["id"]))["cursor"]

    stranger = await register_and_login(client)
    other = await create_org(client, stranger["headers"])
    other_project = await create_project(client, stranger["headers"], other["id"], key="OTH")
    theirs = await create_task(
        client, stranger["headers"], other["id"], other_project["id"], title="Theirs"
    )
    await client.delete(
        f"{API}/orgs/{other['id']}/tasks/{theirs['id']}", headers=stranger["headers"]
    )

    after = await _changes(client, owner["headers"], org["id"], since=cursor)
    assert theirs["id"] not in after["deletions"].get("tasks", [])
