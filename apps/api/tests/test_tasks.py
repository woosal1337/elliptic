"""Task numbering, transitions, filters, board, and label tests."""

import asyncio
import uuid
from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy import select, update

from elliptic.core.database import session_factory
from elliptic.core.models_base import utcnow
from elliptic.modules.tasks.models import Task
from elliptic.modules.tasks.service import CREATION_GRACE_SECONDS
from elliptic.modules.users.models import User
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


async def test_resolve_task_by_identifier(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="RES")
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="Resolve me")
    assert task["identifier"] == "RES-1"

    resolved = await client.get(
        f"{API}/orgs/{org['id']}/tasks/by-identifier/RES-1", headers=auth["headers"]
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["data"]["id"] == task["id"]

    lower = await client.get(
        f"{API}/orgs/{org['id']}/tasks/by-identifier/res-1", headers=auth["headers"]
    )
    assert lower.json()["data"]["id"] == task["id"]

    missing = await client.get(
        f"{API}/orgs/{org['id']}/tasks/by-identifier/RES-999", headers=auth["headers"]
    )
    assert missing.status_code == 404


async def test_task_archive_hides_from_list(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="ARC")
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    base = f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks"

    archived = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/archive",
        json={"archived": True},
        headers=auth["headers"],
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()["data"]["archived_at"] is not None

    default_list = await client.get(base, headers=auth["headers"])
    assert all(item["id"] != task["id"] for item in default_list.json()["data"]["items"])

    with_archived = await client.get(
        base, params={"include_archived": "true"}, headers=auth["headers"]
    )
    assert any(item["id"] == task["id"] for item in with_archived.json()["data"]["items"])

    restored = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/archive",
        json={"archived": False},
        headers=auth["headers"],
    )
    assert restored.json()["data"]["archived_at"] is None


async def test_task_links_crud(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="LINK")
    task = await create_task(client, auth["headers"], org["id"], project["id"])

    added = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/links",
        json={"url": "https://example.com/spec", "title": "Spec"},
        headers=auth["headers"],
    )
    assert added.status_code == 201, added.text
    link = added.json()["data"]
    assert link["url"] == "https://example.com/spec"
    assert link["title"] == "Spec"

    listing = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/links", headers=auth["headers"]
    )
    assert len(listing.json()["data"]) == 1

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/links/{link['id']}", headers=auth["headers"]
    )
    assert deleted.status_code == 200
    empty = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/links", headers=auth["headers"]
    )
    assert empty.json()["data"] == []


async def test_definition_of_done(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="DOD")
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="Feature")

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={
            "dod_items": [
                {"text": "Tests pass", "done": True},
                {"text": "Docs updated", "done": False},
            ],
            "acceptance_criteria": "Given X, when Y, then Z.",
        },
        headers=auth["headers"],
    )
    assert updated.status_code == 200, updated.text
    data = updated.json()["data"]
    assert len(data["dod_items"]) == 2
    assert data["dod_items"][0] == {"text": "Tests pass", "done": True}
    assert data["acceptance_criteria"] == "Given X, when Y, then Z."


async def test_work_item_updates(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="UPD")
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="Ship it")
    base = f"{API}/orgs/{org['id']}/tasks/{task['id']}/updates"

    posted = await client.post(
        base,
        json={"health": "at_risk", "summary": "Blocked on review capacity."},
        headers=auth["headers"],
    )
    assert posted.status_code == 201, posted.text
    assert posted.json()["data"]["health"] == "at_risk"

    listing = await client.get(base, headers=auth["headers"])
    rows = listing.json()["data"]
    assert len(rows) == 1
    assert rows[0]["summary"] == "Blocked on review capacity."


async def test_duplicate_task_copies_content(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="DUP")
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="Original")
    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"priority": "high", "dod_items": [{"text": "ship", "done": False}]},
        headers=auth["headers"],
    )

    duplicated = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/duplicate", headers=auth["headers"]
    )
    assert duplicated.status_code == 201, duplicated.text
    copy = duplicated.json()["data"]
    assert copy["title"] == "Original (copy)"
    assert copy["priority"] == "high"
    assert copy["dod_items"] == [{"text": "ship", "done": False}]
    assert copy["id"] != task["id"]
    assert copy["number"] != task["number"]


async def test_convert_task_kind_to_epic_detaches_parent(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="CNV")
    parent = await create_task(client, auth["headers"], org["id"], project["id"], title="Parent")
    child_resp = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Child", "parent_task_id": parent["id"]},
        headers=auth["headers"],
    )
    child = child_resp.json()["data"]
    assert child["parent_task_id"] == parent["id"]

    converted = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{child['id']}/convert",
        json={"kind": "epic"},
        headers=auth["headers"],
    )
    assert converted.status_code == 200, converted.text
    data = converted.json()["data"]
    assert data["kind"] == "epic"
    assert data["parent_task_id"] is None


async def test_throughput_trend(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="THR")
    task = await create_task(client, auth["headers"], org["id"], project["id"], title="Ship")
    async with session_factory() as scoped:
        await scoped.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task["id"]))
            .values(created_at=utcnow() - timedelta(seconds=CREATION_GRACE_SECONDS + 30))
        )
        await scoped.commit()
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=auth["headers"],
    )

    trend = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/analytics/throughput?days=14",
        headers=auth["headers"],
    )
    assert trend.status_code == 200, trend.text
    points = trend.json()["data"]
    assert len(points) == 14
    today = points[-1]
    assert today["created"] >= 1
    assert today["resolved"] >= 1


async def test_work_item_schema_endpoint(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="SCH")
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/properties",
        json={"name": "Team", "type": "text", "options": []},
        headers=auth["headers"],
    )
    schema = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/work-item-schema",
        headers=auth["headers"],
    )
    assert schema.status_code == 200, schema.text
    data = schema.json()["data"]
    assert "epic" in data["kinds"]
    assert "task" in data["kinds"]
    assert "urgent" in data["priorities"]
    category_by_status = {s["value"]: s["category"] for s in data["statuses"]}
    assert category_by_status["done"] == "completed"
    assert any(p["name"] == "Team" for p in data["custom_properties"])


async def test_work_item_templates(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="TPL")
    base = f"{API}/orgs/{org['id']}/projects/{project['id']}/templates"

    created = await client.post(
        base,
        json={"name": "Bug report", "title": "[Bug] ", "kind": "bug", "priority": "high"},
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    template = created.json()["data"]
    assert template["kind"] == "bug"
    assert template["priority"] == "high"

    listing = await client.get(base, headers=auth["headers"])
    assert len(listing.json()["data"]) == 1

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/templates/{template['id']}", headers=auth["headers"]
    )
    assert deleted.status_code == 200


async def test_task_subscribers_roster(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="SUB")
    task = await create_task(client, auth["headers"], org["id"], project["id"])

    subscribed = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/subscribe", headers=auth["headers"]
    )
    assert subscribed.status_code == 200, subscribed.text

    roster = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/subscribers", headers=auth["headers"]
    )
    assert roster.status_code == 200
    assert auth["user_id"] in roster.json()["data"]


async def test_task_note_links(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="NLK")
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    note = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Spec doc", "content": "details"},
        headers=auth["headers"],
    )
    note_id = note.json()["data"]["id"]

    linked = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/notes/{note_id}", headers=auth["headers"]
    )
    assert linked.status_code == 201, linked.text

    listing = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/notes", headers=auth["headers"]
    )
    rows = listing.json()["data"]
    assert len(rows) == 1
    assert rows[0]["note_id"] == note_id
    assert rows[0]["title"] == "Spec doc"

    unlinked = await client.delete(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/notes/{note_id}", headers=auth["headers"]
    )
    assert unlinked.status_code == 200
    empty = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/notes", headers=auth["headers"]
    )
    assert empty.json()["data"] == []


async def test_task_kinds_story_and_epic(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="KIND")
    for kind in ("task", "story", "epic"):
        created = await create_task(
            client, auth["headers"], org["id"], project["id"], title=f"A {kind}", kind=kind
        )
        assert created["kind"] == kind


async def test_task_numbering_sequential(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="SEQ")
    first = await create_task(client, auth["headers"], org["id"], project["id"], title="First")
    second = await create_task(client, auth["headers"], org["id"], project["id"], title="Second")
    assert first["identifier"] == "SEQ-1"
    assert second["identifier"] == "SEQ-2"


async def test_task_numbering_concurrent(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="RACE")
    responses = await asyncio.gather(
        *(
            client.post(
                f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
                json={"title": f"Concurrent {index}"},
                headers=auth["headers"],
            )
            for index in range(10)
        )
    )
    assert all(response.status_code == 201 for response in responses)
    numbers = sorted(response.json()["data"]["number"] for response in responses)
    assert numbers == list(range(1, 11))


async def test_status_transition_writes_activity(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="FLOW")
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    async with session_factory() as session:
        await session.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task["id"]))
            .values(created_at=utcnow() - timedelta(seconds=CREATION_GRACE_SECONDS + 60))
        )
        await session.commit()
    transition = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=auth["headers"],
    )
    assert transition.status_code == 200
    assert transition.json()["data"]["status"] == "in_progress"

    feed = await client.get(
        f"{API}/orgs/{org['id']}/activity/task/{task['id']}", headers=auth["headers"]
    )
    assert feed.status_code == 200
    events = feed.json()["data"]["items"]
    status_events = [event for event in events if event["event_type"] == "status_changed"]
    assert len(status_events) == 1
    assert status_events[0]["payload"] == {"from": "backlog", "to": "in_progress"}

    same = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=auth["headers"],
    )
    assert same.status_code == 400


async def test_task_filters_and_search(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="FILT")
    # The other two stay unassigned so the assignee filter has something to exclude.
    await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Fix login bug",
        unassigned=True,
    )
    todo = await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Ship dashboard",
        status="todo",
        unassigned=True,
    )
    assigned = await create_task(
        client,
        auth["headers"],
        org["id"],
        project["id"],
        title="Assigned work",
        assignee_id=auth["user_id"],
    )

    by_status = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        params={"status": "todo"},
        headers=auth["headers"],
    )
    assert [t["id"] for t in by_status.json()["data"]["items"]] == [todo["id"]]

    by_assignee = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        params={"assignee_id": auth["user_id"]},
        headers=auth["headers"],
    )
    assert [t["id"] for t in by_assignee.json()["data"]["items"]] == [assigned["id"]]

    by_search = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        params={"search": "login"},
        headers=auth["headers"],
    )
    items = by_search.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Fix login bug"


async def test_board_groups_by_status(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="BORD")
    await create_task(client, auth["headers"], org["id"], project["id"], title="B1")
    await create_task(client, auth["headers"], org["id"], project["id"], title="T1", status="todo")
    await create_task(client, auth["headers"], org["id"], project["id"], title="T2", status="todo")
    board = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks/board", headers=auth["headers"]
    )
    assert board.status_code == 200
    columns = {column["status"]: column["tasks"] for column in board.json()["data"]}
    assert len(columns["backlog"]) == 1
    assert len(columns["todo"]) == 2
    assert columns["done"] == []


async def test_assignee_must_be_project_member(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    other = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="ASGN")
    response = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Bad assignee", "assignee_id": other["user_id"]},
        headers=owner["headers"],
    )
    assert response.status_code == 400


async def test_labels_attach_and_filter(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="LABL")
    label = await client.post(
        f"{API}/orgs/{org['id']}/labels",
        json={"name": "bug", "color": "#ff0000"},
        headers=auth["headers"],
    )
    assert label.status_code == 201
    label_id = label.json()["data"]["id"]
    tagged = await create_task(
        client, auth["headers"], org["id"], project["id"], title="Tagged", label_ids=[label_id]
    )
    assert [lab["name"] for lab in tagged["labels"]] == ["bug"]
    await create_task(client, auth["headers"], org["id"], project["id"], title="Untagged")
    filtered = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        params={"label_id": label_id},
        headers=auth["headers"],
    )
    assert [t["id"] for t in filtered.json()["data"]["items"]] == [tagged["id"]]


async def test_non_member_cannot_access_project_tasks(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    member = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], member)
    project = await create_project(client, owner["headers"], org["id"], key="GATE")
    task = await create_task(client, owner["headers"], org["id"], project["id"])

    listed = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks", headers=member["headers"]
    )
    assert listed.status_code == 403

    board = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks/board", headers=member["headers"]
    )
    assert board.status_code == 403

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=member["headers"]
    )
    assert fetched.status_code == 403

    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Sneaky"},
        headers=member["headers"],
    )
    assert created.status_code == 403

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"title": "Hijacked"},
        headers=member["headers"],
    )
    assert updated.status_code == 403

    moved = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=member["headers"],
    )
    assert moved.status_code == 403

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=member["headers"]
    )
    assert deleted.status_code == 403


async def test_project_member_can_access_project_tasks(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    member = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], member)
    project = await create_project(client, owner["headers"], org["id"], key="MEMB")
    assigned = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": member["user_id"]},
        headers=owner["headers"],
    )
    assert assigned.status_code == 201

    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Member task"},
        headers=member["headers"],
    )
    assert created.status_code == 201

    listed = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks", headers=member["headers"]
    )
    assert listed.status_code == 200


async def test_org_admin_can_access_non_member_project_tasks(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    admin = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], admin, role="admin")
    project = await create_project(client, owner["headers"], org["id"], key="ADMN")

    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Admin task"},
        headers=admin["headers"],
    )
    assert created.status_code == 201


async def test_archived_project_blocks_task_mutations(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="ARCH")
    task = await create_task(client, owner["headers"], org["id"], project["id"])

    archived = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"status": "archived"},
        headers=owner["headers"],
    )
    assert archived.status_code == 200

    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Blocked"},
        headers=owner["headers"],
    )
    assert created.status_code == 400
    assert created.json()["message"] == "Project is archived"

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"title": "Blocked"},
        headers=owner["headers"],
    )
    assert updated.status_code == 400

    moved = await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=owner["headers"],
    )
    assert moved.status_code == 400

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"]
    )
    assert deleted.status_code == 400

    listed = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks", headers=owner["headers"]
    )
    assert listed.status_code == 200

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"]
    )
    assert fetched.status_code == 200


async def test_deleting_creator_nulls_task_created_by(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    creator = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], creator)
    project = await create_project(client, owner["headers"], org["id"], key="NULL")
    assigned = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": creator["user_id"]},
        headers=owner["headers"],
    )
    assert assigned.status_code == 201
    task = await create_task(client, creator["headers"], org["id"], project["id"])
    assert task["created_by"] == creator["user_id"]

    task_id = uuid.UUID(task["id"])
    creator_id = uuid.UUID(creator["user_id"])
    async with session_factory() as session:
        user = await session.get(User, creator_id)
        assert user is not None
        await session.delete(user)
        await session.commit()

    async with session_factory() as session:
        stored = await session.scalar(select(Task).where(Task.id == task_id))
        assert stored is not None
        assert stored.created_by is None


async def test_new_task_defaults_to_its_creator(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    creator = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], creator)
    project = await create_project(client, owner["headers"], org["id"], key="MINE")
    assigned = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": creator["user_id"]},
        headers=owner["headers"],
    )
    assert assigned.status_code == 201

    mine = await create_task(client, creator["headers"], org["id"], project["id"], title="Mine")
    assert mine["assignee_id"] == creator["user_id"]

    theirs = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Theirs", "assignee_id": owner["user_id"]},
        headers=creator["headers"],
    )
    assert theirs.status_code == 201, theirs.text
    assert theirs.json()["data"]["assignee_id"] == owner["user_id"]

    nobody = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "Nobody", "unassigned": True},
        headers=creator["headers"],
    )
    assert nobody.status_code == 201, nobody.text
    assert nobody.json()["data"]["assignee_id"] is None


async def test_project_default_assignee_outranks_the_creator(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    creator = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], creator)
    project = await create_project(client, owner["headers"], org["id"], key="PDA")
    assigned = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": creator["user_id"]},
        headers=owner["headers"],
    )
    assert assigned.status_code == 201
    await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"default_assignee_id": owner["user_id"]},
        headers=owner["headers"],
    )

    task = await create_task(client, creator["headers"], org["id"], project["id"], title="Routed")
    assert task["assignee_id"] == owner["user_id"]
