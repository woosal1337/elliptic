"""Note CRUD and search tests."""

from httpx import AsyncClient

from tests.helpers import API, add_org_member, create_org, register_and_login


async def test_note_icon_and_org_wide_read(client: AsyncClient) -> None:
    """A note carries its icon, and every org member can read every note."""
    owner = await register_and_login(client)
    member = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    await add_org_member(client, owner["headers"], org["id"], member)

    created = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Spec", "content": "# Spec\nbody", "icon": "📄"},
        headers=owner["headers"],
    )
    assert created.status_code == 201, created.text
    note = created.json()["data"]
    assert note["icon"] == "📄"
    assert "visibility" not in note

    fetched = await client.get(
        f"{API}/orgs/{org['id']}/notes/{note['id']}", headers=member["headers"]
    )
    assert fetched.status_code == 200
    assert fetched.json()["data"]["content"] == "# Spec\nbody"


async def test_note_nested_pages(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    parent = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Handbook", "content": "root"},
        headers=auth["headers"],
    )
    parent_id = parent.json()["data"]["id"]
    assert parent.json()["data"]["parent_id"] is None

    child = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Onboarding", "content": "child", "parent_id": parent_id},
        headers=auth["headers"],
    )
    assert child.status_code == 201, child.text
    child_id = child.json()["data"]["id"]
    assert child.json()["data"]["parent_id"] == parent_id

    self_parent = await client.patch(
        f"{API}/orgs/{org['id']}/notes/{child_id}",
        json={"parent_id": child_id},
        headers=auth["headers"],
    )
    assert self_parent.status_code == 400


async def test_note_crud_and_search(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Roadmap", "content": "Ship the BYOK flow next sprint"},
        headers=auth["headers"],
    )
    assert created.status_code == 201
    note = created.json()["data"]
    await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Grocery list", "content": "milk, eggs"},
        headers=auth["headers"],
    )

    searched = await client.get(
        f"{API}/orgs/{org['id']}/notes", params={"search": "BYOK"}, headers=auth["headers"]
    )
    items = searched.json()["data"]["items"]
    assert [item["id"] for item in items] == [note["id"]]

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/notes/{note['id']}",
        json={"content": "Updated content"},
        headers=auth["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["content"] == "Updated content"
    assert updated.json()["data"]["updated_by"] == auth["user_id"]

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/notes/{note['id']}", headers=auth["headers"]
    )
    assert deleted.status_code == 200
    gone = await client.get(f"{API}/orgs/{org['id']}/notes/{note['id']}", headers=auth["headers"])
    assert gone.status_code == 404


async def test_folders_hold_notes_and_refuse_to_strand_them(client: AsyncClient) -> None:
    """A folder is a note others sit under, and it cannot quietly abandon them."""
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/notes"

    folder = (
        await client.post(base, json={"title": "Runbooks", "is_folder": True}, headers=h)
    ).json()["data"]
    assert folder["is_folder"] is True

    # A note created inside the folder carries it as its parent.
    doc = (
        await client.post(
            base, json={"title": "Restore from backup", "parent_id": folder["id"]}, headers=h
        )
    ).json()["data"]
    assert doc["parent_id"] == folder["id"]
    assert doc["is_folder"] is False

    # Demoting a folder that still holds something is refused rather than
    # leaving the child pointing at a parent nobody can open.
    refused = await client.patch(f"{base}/{folder['id']}", json={"is_folder": False}, headers=h)
    assert refused.status_code == 400, refused.text

    # Moving the child out is what makes it possible.
    moved = await client.patch(f"{base}/{doc['id']}", json={"parent_id": None}, headers=h)
    assert moved.status_code == 200, moved.text

    assert moved.json()["data"]["parent_id"] is None, "a note must be able to leave a folder"

    # With the folder empty, demoting it is allowed.
    again = await client.patch(f"{base}/{folder['id']}", json={"is_folder": False}, headers=h)
    assert again.status_code == 200, again.text
    assert again.json()["data"]["is_folder"] is False
