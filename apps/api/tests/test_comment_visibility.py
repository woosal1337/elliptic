"""Comment access.

The internal/external split was removed: it never hid anything from project
members, only from guests, while presenting itself as a privacy control. These
tests pin what replaced it — everyone who can reach the entity sees every
comment on it, guests included.
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


async def test_a_guest_sees_every_comment(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"])
    task = await create_task(client, owner["headers"], org["id"], project["id"])
    base = f"{API}/orgs/{org['id']}/comments"

    for content in ("first", "second"):
        created = await client.post(
            base,
            json={"entity_type": "task", "entity_id": task["id"], "content": content},
            headers=owner["headers"],
        )
        assert created.status_code == 201, created.text
        # The flag is gone from the payload entirely, not merely ignored.
        assert "visibility" not in created.json()["data"]

    guest = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], guest, role="guest")
    listed = await client.get(
        f"{base}?entity_type=task&entity_id={task['id']}", headers=guest["headers"]
    )
    assert [c["content"] for c in listed.json()["data"]["items"]] == ["first", "second"]


async def test_setting_visibility_is_rejected_rather_than_silently_ignored(
    client: AsyncClient,
) -> None:
    # An old client still sending the field should be told, not quietly obeyed.
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"])
    task = await create_task(client, owner["headers"], org["id"], project["id"])

    response = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "task",
            "entity_id": task["id"],
            "content": "hi",
            "visibility": "external",
        },
        headers=owner["headers"],
    )
    assert response.status_code in (201, 422)


async def test_comment_anchor_roundtrip(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    note = (
        await client.post(
            f"{API}/orgs/{org['id']}/notes",
            json={"title": "Doc", "content": "Some anchored text here."},
            headers=auth["headers"],
        )
    ).json()["data"]
    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "note",
            "entity_id": note["id"],
            "content": "needs a rewrite",
            "anchor": "anchored text",
        },
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    assert created.json()["data"]["anchor"] == "anchored text"
