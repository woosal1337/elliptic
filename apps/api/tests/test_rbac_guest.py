"""Guest tier + commenter tier + guest-ceiling enforcement (COS-166)."""

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


async def _guest_in_org(client: AsyncClient, owner: dict, org_id: str) -> dict:
    guest = await register_and_login(client)
    await add_org_member(client, owner["headers"], org_id, guest, role="guest")
    guest["id"] = (await client.get(f"{API}/users/me", headers=guest["headers"])).json()["data"][
        "id"
    ]
    return guest


async def test_guest_project_role_ceiling(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="GST")
    guest = await _guest_in_org(client, owner, org["id"])
    base = f"{API}/orgs/{org['id']}/projects/{project['id']}/members"

    for role in ("member", "admin"):
        blocked = await client.post(
            base, json={"user_id": guest["id"], "role": role}, headers=owner["headers"]
        )
        assert blocked.status_code == 400, f"{role}: {blocked.text}"

    added = await client.post(
        base, json={"user_id": guest["id"], "role": "commenter"}, headers=owner["headers"]
    )
    assert added.status_code == 201, added.text
    assert added.json()["data"]["role"] == "commenter"

    promoted = await client.patch(
        f"{base}/{guest['id']}", json={"role": "member"}, headers=owner["headers"]
    )
    assert promoted.status_code == 400, promoted.text


async def test_non_guest_member_unaffected(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="MEM")
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    member_id = (await client.get(f"{API}/users/me", headers=member["headers"])).json()["data"][
        "id"
    ]
    added = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": member_id, "role": "admin"},
        headers=owner["headers"],
    )
    assert added.status_code == 201, added.text
    assert added.json()["data"]["role"] == "admin"


async def test_guest_self_join_capped_to_commenter(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="PUBG")
    await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"network": "public"},
        headers=owner["headers"],
    )
    guest = await _guest_in_org(client, owner, org["id"])

    joined = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/join", headers=guest["headers"]
    )
    assert joined.status_code == 201, joined.text
    assert joined.json()["data"]["role"] == "commenter"


async def test_guest_not_assignable(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="ASG")
    guest = await _guest_in_org(client, owner, org["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": guest["id"], "role": "viewer"},
        headers=owner["headers"],
    )

    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "For a guest", "assignee_id": guest["id"]},
        headers=owner["headers"],
    )
    assert created.status_code == 400, created.text

    task = await create_task(client, owner["headers"], org["id"], project["id"])
    updated = await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"assignee_id": guest["id"]},
        headers=owner["headers"],
    )
    assert updated.status_code == 400, updated.text


async def test_guest_default_assignee_not_auto_assigned(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="DEF")
    guest = await _guest_in_org(client, owner, org["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": guest["id"], "role": "viewer"},
        headers=owner["headers"],
    )
    await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"default_assignee_id": guest["id"]},
        headers=owner["headers"],
    )
    created = await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks",
        json={"title": "No default to a guest"},
        headers=owner["headers"],
    )
    assert created.status_code == 201, created.text
    # The guest default is skipped, so it falls through to the creator.
    assert created.json()["data"]["assignee_id"] == owner["user_id"]


async def test_guest_invite_to_project_capped(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="INV")
    guest = await register_and_login(client)
    invite = await client.post(
        f"{API}/orgs/{org['id']}/invites",
        json={"email": guest["email"], "role": "guest", "project_id": project["id"]},
        headers=owner["headers"],
    )
    token = invite.json()["data"]["token"]
    accepted = await client.post(
        f"{API}/invites/accept", json={"token": token}, headers=guest["headers"]
    )
    assert accepted.status_code == 200, accepted.text
    guest_id = (await client.get(f"{API}/users/me", headers=guest["headers"])).json()["data"]["id"]
    members = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members", headers=owner["headers"]
    )
    roles = {m["user_id"]: m["role"] for m in members.json()["data"]}
    assert roles.get(guest_id) == "commenter", roles


async def test_guest_cannot_create_project(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    guest = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], guest, role="guest")
    blocked = await client.post(
        f"{API}/orgs/{org['id']}/projects",
        json={"name": "Guest project", "key": "GP"},
        headers=guest["headers"],
    )
    assert blocked.status_code == 403, blocked.text


async def test_automation_assign_rejects_and_skips_guest(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="AUT")
    guest = await _guest_in_org(client, owner, org["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": guest["id"], "role": "viewer"},
        headers=owner["headers"],
    )
    rejected = await client.post(
        f"{API}/orgs/{org['id']}/automations",
        json={
            "name": "Assign to guest",
            "trigger": "on_triage_entry",
            "actions": [{"type": "assign", "value": guest["id"]}],
        },
        headers=owner["headers"],
    )
    assert rejected.status_code == 400, rejected.text


async def test_guest_intake_owner_rejected_and_skipped(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="ITK")
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    member_id = (await client.get(f"{API}/users/me", headers=member["headers"])).json()["data"][
        "id"
    ]

    guest = await _guest_in_org(client, owner, org["id"])
    rejected = await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"intake_owner_id": guest["id"]},
        headers=owner["headers"],
    )
    assert rejected.status_code == 400, rejected.text

    await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"intake_owner_id": member_id},
        headers=owner["headers"],
    )
    await client.patch(
        f"{API}/orgs/{org['id']}/members/{member_id}",
        json={"role": "guest"},
        headers=owner["headers"],
    )
    token = (
        await client.post(
            f"{API}/orgs/{org['id']}/projects/{project['id']}/intake/enable",
            headers=owner["headers"],
        )
    ).json()["data"]["intake_token"]
    submit = await client.post(f"{API}/intake/{token}", json={"title": "From the public"})
    assert submit.status_code == 200, submit.text
    triage = await client.get(f"{API}/orgs/{org['id']}/triage", headers=owner["headers"])
    item = next(t for t in triage.json()["data"] if t["title"] == "From the public")
    assert item["assignee_id"] is None


async def test_demotion_to_guest_reconciles_roles_and_assignments(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="DEM")
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    member_id = (await client.get(f"{API}/users/me", headers=member["headers"])).json()["data"][
        "id"
    ]
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": member_id, "role": "admin"},
        headers=owner["headers"],
    )
    task = await create_task(client, owner["headers"], org["id"], project["id"])
    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}",
        json={"assignee_id": member_id},
        headers=owner["headers"],
    )

    demoted = await client.patch(
        f"{API}/orgs/{org['id']}/members/{member_id}",
        json={"role": "guest"},
        headers=owner["headers"],
    )
    assert demoted.status_code == 200, demoted.text

    members = await client.get(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members", headers=owner["headers"]
    )
    roles = {m["user_id"]: m["role"] for m in members.json()["data"]}
    assert roles[member_id] == "commenter"
    fetched = await client.get(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=owner["headers"]
    )
    assert fetched.json()["data"]["assignee_id"] is None


async def test_guest_is_not_admin_for_comments(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="CMG")
    task = await create_task(client, owner["headers"], org["id"], project["id"])
    guest = await _guest_in_org(client, owner, org["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/projects/{project['id']}/members",
        json={"user_id": guest["id"], "role": "commenter"},
        headers=owner["headers"],
    )
    comment = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={"entity_type": "task", "entity_id": task["id"], "content": "owner note"},
        headers=owner["headers"],
    )
    comment_id = comment.json()["data"]["id"]

    edited = await client.patch(
        f"{API}/orgs/{org['id']}/comments/{comment_id}",
        json={"content": "hijacked"},
        headers=guest["headers"],
    )
    assert edited.status_code == 403, edited.text
    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/comments/{comment_id}", headers=guest["headers"]
    )
    assert deleted.status_code == 403, deleted.text


async def test_guest_is_not_admin_for_team_events(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    guest = await _guest_in_org(client, owner, org["id"])
    start = datetime.now(UTC) + timedelta(days=1)
    event = await client.post(
        f"{API}/orgs/{org['id']}/events",
        json={
            "title": "Team sync",
            "visibility": "team",
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=1)).isoformat(),
        },
        headers=owner["headers"],
    )
    event_id = event.json()["data"]["id"]

    blocked = await client.patch(
        f"{API}/orgs/{org['id']}/events/{event_id}",
        json={"title": "Hijacked"},
        headers=guest["headers"],
    )
    assert blocked.status_code == 403, blocked.text
