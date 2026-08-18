"""Tests for sub-tasks, relations, subscriptions, bug SLA, soft-delete, and meeting loop-close."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def test_subtask_single_level_enforced(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    parent = await create_task(client, auth["headers"], org["id"], project["id"], title="Parent")
    child = await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Child",
        parent_task_id=parent["id"],
    )
    assert child["parent_task_id"] == parent["id"]

    grandchild = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Grandchild", "parent_task_id": child["id"]},
        headers=auth["headers"],
    )
    assert grandchild.status_code == 400


async def test_parent_progress_pill_counts(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    parent = await create_task(client, auth["headers"], org["id"], project["id"], title="Parent")
    first = await create_task(
        client, auth["headers"], org["id"], project["id"], parent_task_id=parent["id"]
    )
    await create_task(
        client, auth["headers"], org["id"], project["id"], parent_task_id=parent["id"]
    )
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{first['id']}/status",
        json={"status": "done"},
        headers=auth["headers"],
    )
    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{parent['id']}", headers=auth["headers"]
    )
    body = fetched.json()["data"]
    assert body["subtask_total"] == 2
    assert body["subtask_done"] == 1


async def test_grouped_relations_with_due_dates(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    src = await create_task(client, auth["headers"], org["id"], project["id"], title="Source")
    a = await create_task(client, auth["headers"], org["id"], project["id"], title="A")
    b = await create_task(client, auth["headers"], org["id"], project["id"], title="B")

    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{a['id']}",
        json={"due_date": "2026-08-01"},
        headers=auth["headers"],
    )
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{src['id']}/relations",
        json={"target_task_id": a["id"], "type": "blocks"},
        headers=auth["headers"],
    )
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{src['id']}/relations",
        json={"target_task_id": b["id"], "type": "related"},
        headers=auth["headers"],
    )

    grouped = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{src['id']}/relations/grouped", headers=auth["headers"]
    )
    assert grouped.status_code == 200, grouped.text
    data = grouped.json()["data"]
    assert {row["task_id"] for row in data["blocks"]} == {a["id"]}
    assert data["blocks"][0]["due_date"] == "2026-08-01"
    assert {row["task_id"] for row in data["related"]} == {b["id"]}


async def test_bulk_relations_per_target_status(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    src = await create_task(client, auth["headers"], org["id"], project["id"], title="Source")
    a = await create_task(client, auth["headers"], org["id"], project["id"], title="A")
    b = await create_task(client, auth["headers"], org["id"], project["id"], title="B")

    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{src['id']}/relations",
        json={"target_task_id": a["id"], "type": "blocks"},
        headers=auth["headers"],
    )

    bulk = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{src['id']}/relations/bulk",
        json={"target_task_ids": [a["id"], b["id"], src["id"]], "type": "blocks"},
        headers=auth["headers"],
    )
    assert bulk.status_code == 201, bulk.text
    by_target = {row["target_task_id"]: row["status"] for row in bulk.json()["data"]}
    assert by_target[a["id"]] == "exists"
    assert by_target[b["id"]] == "created"
    assert by_target[src["id"]] == "skipped"


async def test_duplicate_and_implements_relations(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    a = await create_task(client, auth["headers"], org["id"], project["id"], title="A")
    b = await create_task(client, auth["headers"], org["id"], project["id"], title="B")

    for relation_type in ("duplicate", "implements"):
        created = await client.post(
            f"{API}/orgs/{org['id']}/tasks/{a['id']}/relations",
            json={"target_task_id": b["id"], "type": relation_type},
            headers=auth["headers"],
        )
        assert created.status_code == 201, created.text

    rels_a = {
        (row["task_id"], row["type"])
        for row in (
            await client.get(
                f"{API}/orgs/{org['id']}/tasks/{a['id']}/relations", headers=auth["headers"]
            )
        ).json()["data"]
    }
    assert (b["id"], "duplicate") in rels_a
    assert (b["id"], "implements") in rels_a

    rels_b = {
        (row["task_id"], row["type"])
        for row in (
            await client.get(
                f"{API}/orgs/{org['id']}/tasks/{b['id']}/relations", headers=auth["headers"]
            )
        ).json()["data"]
    }
    assert (a["id"], "duplicate_of") in rels_b
    assert (a["id"], "implemented_by") in rels_b


async def test_blocks_relation_marks_blocked(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    blocker = await create_task(client, auth["headers"], org["id"], project["id"], title="Blocker")
    blocked = await create_task(client, auth["headers"], org["id"], project["id"], title="Blocked")

    created = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{blocker['id']}/relations",
        json={"target_task_id": blocked["id"], "type": "blocks"},
        headers=auth["headers"],
    )
    assert created.status_code == 201

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{blocked['id']}", headers=auth["headers"]
    )
    assert fetched.json()["data"]["blocked"] is True

    relations = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{blocked['id']}/relations", headers=auth["headers"]
    )
    rows = relations.json()["data"]
    assert any(row["type"] == "blocked_by" and row["task_id"] == blocker["id"] for row in rows)


async def test_blocked_clears_when_blocker_done(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    blocker = await create_task(client, auth["headers"], org["id"], project["id"])
    blocked = await create_task(client, auth["headers"], org["id"], project["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{blocker['id']}/relations",
        json={"target_task_id": blocked["id"], "type": "blocks"},
        headers=auth["headers"],
    )
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{blocker['id']}/status",
        json={"status": "done"},
        headers=auth["headers"],
    )
    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{blocked['id']}", headers=auth["headers"]
    )
    assert fetched.json()["data"]["blocked"] is False


async def test_bug_gets_sla_due_date(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    bug = await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Crash on save",
        kind="bug",
        severity="critical",
    )
    assert bug["kind"] == "bug"
    assert bug["severity"] == "critical"
    expected = (datetime.now(UTC) + timedelta(days=1)).date()
    assert bug["due_date"] == expected.isoformat()


async def test_component_and_severity_filter(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    base = f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks"

    bug = await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Auth crash",
        kind="bug",
        severity="critical",
        component="auth",
    )
    assert bug["component"] == "auth"

    await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Minor glitch",
        kind="bug",
        severity="low",
    )

    crit = await client.get(f"{base}?severity=critical", headers=auth["headers"])
    assert {t["title"] for t in crit.json()["data"]["items"]} == {"Auth crash"}

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{bug['id']}",
        json={"clear_component": True},
        headers=auth["headers"],
    )
    assert updated.json()["data"]["component"] is None


async def test_bug_requires_severity(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Bug without severity", "kind": "bug"},
        headers=auth["headers"],
    )
    assert response.status_code == 400


async def test_task_subscription_toggle(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    unsub = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/unsubscribe", headers=auth["headers"]
    )
    assert unsub.status_code == 200
    resub = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/subscribe", headers=auth["headers"]
    )
    assert resub.status_code == 200


async def test_project_soft_delete_and_restore(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"]
    )
    assert deleted.status_code == 200

    listing = await client.get(f"{API}/orgs/{org['id']}/projects", headers=auth["headers"])
    assert all(item["id"] != project["id"] for item in listing.json()["data"])

    deleted_list = await client.get(
        f"{API}/orgs/{org['id']}/projects/deleted", headers=auth["headers"]
    )
    assert any(item["id"] == project["id"] for item in deleted_list.json()["data"])

    restored = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/restore", headers=auth["headers"]
    )
    assert restored.status_code == 200
    after = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"]
    )
    assert after.status_code == 200


async def test_meeting_loop_close_notifies_attendees(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    teammate = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], teammate)
    project = await create_project(client, owner["headers"], org["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": teammate["user_id"]},
        headers=owner["headers"],
    )
    meeting_resp = await client.post(
        f"{API}/orgs/{org['id']}/meetings",
        json={
            "title": "Planning",
            "started_at": datetime.now(UTC).isoformat(),
            "attendee_ids": [owner["user_id"]],
        },
        headers=owner["headers"],
    )
    assert meeting_resp.status_code == 201, meeting_resp.text
    meeting = meeting_resp.json()["data"]

    task = await create_task(
        client,
        teammate["headers"],
        org["id"],
        project["id"],
        title="Follow up from meeting",
        source_meeting_id=meeting["id"],
    )
    assert task["source_meeting_id"] == meeting["id"]

    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=teammate["headers"],
    )
    inbox = await client.get(
        f"{API}/orgs/{org['id']}/notifications?status=all", headers=owner["headers"]
    )
    types = {item["type"] for item in inbox.json()["data"]["items"]}
    assert "meeting_action_done" in types


async def test_self_relation_rejected(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/relations",
        json={"target_task_id": task["id"], "type": "related"},
        headers=auth["headers"],
    )
    assert response.status_code == 400
