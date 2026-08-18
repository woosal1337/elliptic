"""Triage automations + invocable skills (TRI-05, AUTO-BE-01/02/03)."""

from httpx import AsyncClient

from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    create_task,
    register_and_login,
)


def _rules(org_id: str) -> str:
    return f"{API}/orgs/{org_id}/automations"


async def _label(client: AsyncClient, headers: dict[str, str], org_id: str, name: str) -> str:
    response = await client.post(
        f"{API}/orgs/{org_id}/labels", json={"name": name}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]["id"]


async def _task_priority(
    client: AsyncClient, headers: dict[str, str], org_id: str, task_id: str
) -> str:
    response = await client.get(f"{API}/orgs/{org_id}/tasks/{task_id}", headers=headers)
    return response.json()["data"]["priority"]


async def test_rule_crud(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        _rules(org["id"]),
        json={
            "name": "Triage labeler",
            "trigger": "on_status_change",
            "actions": [{"type": "set_priority", "value": "high"}],
            "is_skill": False,
        },
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    rule = created.json()["data"]
    assert rule["enabled"] is True
    assert rule["actions"] == [{"type": "set_priority", "value": "high"}]

    listing = await client.get(_rules(org["id"]), headers=auth["headers"])
    assert [r["id"] for r in listing.json()["data"]] == [rule["id"]]

    toggled = await client.patch(
        f"{_rules(org['id'])}/{rule['id']}", json={"enabled": False}, headers=auth["headers"]
    )
    assert toggled.json()["data"]["enabled"] is False

    deleted = await client.delete(f"{_rules(org['id'])}/{rule['id']}", headers=auth["headers"])
    assert deleted.status_code == 200, deleted.text
    assert (await client.get(_rules(org["id"]), headers=auth["headers"])).json()["data"] == []


async def test_invalid_action_is_rejected(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    bad = await client.post(
        _rules(org["id"]),
        json={
            "name": "Bad",
            "trigger": "on_status_change",
            "actions": [{"type": "label", "value": "does-not-exist"}],
            "is_skill": False,
        },
        headers=auth["headers"],
    )
    assert bad.status_code == 400, bad.text


async def test_non_admin_cannot_create(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    response = await client.post(
        _rules(org["id"]),
        json={"name": "X", "trigger": "on_status_change", "actions": [], "is_skill": False},
        headers=member["headers"],
    )
    assert response.status_code == 403, response.text


async def test_on_status_change_sets_priority(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="ASC")
    await client.post(
        _rules(org["id"]),
        json={
            "name": "Escalate on move",
            "trigger": "on_status_change",
            "actions": [{"type": "set_priority", "value": "urgent"}],
            "is_skill": False,
        },
        headers=auth["headers"],
    )
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=auth["headers"],
    )
    assert await _task_priority(client, auth["headers"], org["id"], task["id"]) == "urgent"


async def test_skill_run_applies_actions(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="ASK")
    created = await client.post(
        _rules(org["id"]),
        json={
            "name": "Make high",
            "trigger": "on_status_change",
            "actions": [{"type": "set_priority", "value": "high"}],
            "is_skill": True,
        },
        headers=auth["headers"],
    )
    rule_id = created.json()["data"]["id"]
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    run = await client.post(
        f"{_rules(org['id'])}/{rule_id}/run",
        json={"task_id": task["id"]},
        headers=auth["headers"],
    )
    assert run.status_code == 200, run.text
    assert run.json()["data"] == {"ok": True}
    assert await _task_priority(client, auth["headers"], org["id"], task["id"]) == "high"
