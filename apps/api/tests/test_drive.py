"""The organization Drive: upload, browse, move, reference, delete (COS-409)."""

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.modules.storage import client as storage_client
from tests.helpers import API, add_org_member, create_org, register_and_login


@pytest.fixture(autouse=True)
def _configure_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make storage look configured and stub R2 so the suite stays hermetic."""
    settings = get_settings()
    monkeypatch.setattr(settings, "r2_endpoint_url", "https://acct.r2.cloudflarestorage.com")
    monkeypatch.setattr(settings, "r2_access_key_id", "k")
    monkeypatch.setattr(settings, "r2_secret_access_key", "s")

    monkeypatch.setattr(
        storage_client, "presigned_put", lambda key, ct, **kw: f"https://r2.test/put/{key}"
    )
    monkeypatch.setattr(
        storage_client, "presigned_get", lambda key, **kw: f"https://r2.test/get/{key}"
    )

    async def fake_head(key: str) -> dict[str, object]:
        return {"size": 2048, "etag": "abc123", "content_type": "application/pdf"}

    async def fake_delete(key: str) -> None:
        return None

    monkeypatch.setattr(storage_client, "head_object", fake_head)
    monkeypatch.setattr(storage_client, "delete_object", fake_delete)


async def _upload(
    client: AsyncClient,
    headers: dict[str, str],
    org_id: str,
    *,
    filename: str = "contract.pdf",
    content_type: str = "application/pdf",
    name: str | None = None,
    folder_path: str = "",
) -> dict:
    """Run the full presign -> PUT -> register flow and return the drive file."""
    base = f"{API}/orgs/{org_id}/drive"
    presign = await client.post(
        f"{base}/presign-upload",
        json={"filename": filename, "content_type": content_type, "size_bytes": 2048},
        headers=headers,
    )
    assert presign.status_code == 201, presign.text
    object_id = presign.json()["data"]["object_id"]

    created = await client.post(
        f"{base}/files",
        json={"object_id": object_id, "name": name, "folder_path": folder_path},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    return created.json()["data"]


async def test_upload_browse_download_delete(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/drive"

    presign = await client.post(
        f"{base}/presign-upload",
        json={"filename": "contract.pdf", "content_type": "application/pdf", "size_bytes": 2048},
        headers=h,
    )
    assert presign.status_code == 201, presign.text
    reserved = presign.json()["data"]
    assert reserved["upload_url"].startswith("https://r2.test/put/orgs/")
    assert "/drive/" in reserved["storage_key"]
    assert reserved["max_bytes"] == 100 * 1024 * 1024

    created = await client.post(
        f"{base}/files",
        json={
            "object_id": reserved["object_id"],
            "name": "Acme MSA",
            "folder_path": "contracts/2026",
            "description": "Signed 2026-08-01",
        },
        headers=h,
    )
    assert created.status_code == 201, created.text
    file = created.json()["data"]
    assert file["name"] == "Acme MSA"
    assert file["folder_path"] == "contracts/2026"
    assert file["filename"] == "contract.pdf"
    assert file["size_bytes"] == 2048
    assert file["kind"] == "file"

    listed = await client.get(f"{base}/files", params={"folder_path": "contracts/2026"}, headers=h)
    assert listed.status_code == 200, listed.text
    assert [item["id"] for item in listed.json()["data"]["items"]] == [file["id"]]

    # The root holds no files of its own, so a non-recursive root listing is empty.
    root = await client.get(f"{base}/files", params={"folder_path": ""}, headers=h)
    assert root.json()["data"]["items"] == []

    folders = await client.get(f"{base}/folders", headers=h)
    assert folders.json()["data"] == [{"path": "contracts/2026", "name": "2026", "file_count": 1}]

    dl = await client.get(f"{base}/files/{file['id']}/download", headers=h)
    assert dl.status_code == 200, dl.text
    assert dl.json()["data"]["download_url"].startswith("https://r2.test/get/")
    assert dl.json()["data"]["filename"] == "contract.pdf"

    deleted = await client.delete(f"{base}/files/{file['id']}", headers=h)
    assert deleted.status_code == 200, deleted.text
    assert (await client.get(f"{base}/files/{file['id']}", headers=h)).status_code == 404
    # Deleting the document releases the stored object behind it.
    gone = await client.get(
        f"{API}/orgs/{org['id']}/storage/objects/{reserved['object_id']}", headers=h
    )
    assert gone.status_code == 404


async def test_search_and_recursive_listing(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/drive"

    await _upload(client, h, org["id"], name="Acme MSA", folder_path="contracts/2026")
    await _upload(client, h, org["id"], name="Beta NDA", folder_path="contracts")
    await _upload(client, h, org["id"], name="Floor plan", folder_path="")

    shallow = await client.get(f"{base}/files", params={"folder_path": "contracts"}, headers=h)
    assert [i["name"] for i in shallow.json()["data"]["items"]] == ["Beta NDA"]

    deep = await client.get(
        f"{base}/files", params={"folder_path": "contracts", "recursive": True}, headers=h
    )
    assert sorted(i["name"] for i in deep.json()["data"]["items"]) == ["Acme MSA", "Beta NDA"]

    found = await client.get(f"{base}/files", params={"search": "plan"}, headers=h)
    assert [i["name"] for i in found.json()["data"]["items"]] == ["Floor plan"]
    assert found.json()["data"]["total"] == 1

    everything = await client.get(f"{base}/files", headers=h)
    assert everything.json()["data"]["total"] == 3


async def test_rename_move_and_folder_rename(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/drive"

    file = await _upload(client, h, org["id"], name="Draft", folder_path="legal/drafts")

    renamed = await client.patch(
        f"{base}/files/{file['id']}",
        json={"name": "Acme MSA v2", "folder_path": "legal/signed"},
        headers=h,
    )
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["data"]["name"] == "Acme MSA v2"
    assert renamed.json()["data"]["folder_path"] == "legal/signed"

    moved = await client.post(
        f"{base}/folders/rename", json={"path": "legal", "new_path": "contracts"}, headers=h
    )
    assert moved.status_code == 200, moved.text
    after = await client.get(f"{base}/files/{file['id']}", headers=h)
    assert after.json()["data"]["folder_path"] == "contracts/signed"

    # A folder cannot be moved inside itself, or the prefix update would recurse.
    bad = await client.post(
        f"{base}/folders/rename",
        json={"path": "contracts", "new_path": "contracts/archive"},
        headers=h,
    )
    assert bad.status_code == 400


async def test_folder_path_is_normalized_and_contained(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    messy = await _upload(client, h, org["id"], folder_path="/contracts//2026/")
    assert messy["folder_path"] == "contracts/2026"

    base = f"{API}/orgs/{org['id']}/drive"
    presign = await client.post(
        f"{base}/presign-upload",
        json={"filename": "x.pdf", "content_type": "application/pdf", "size_bytes": 10},
        headers=h,
    )
    escaping = await client.post(
        f"{base}/files",
        json={"object_id": presign.json()["data"]["object_id"], "folder_path": "../../etc"},
        headers=h,
    )
    assert escaping.status_code == 400
    assert ".." in escaping.json()["message"]


async def test_defaults_name_to_filename_and_rejects_reuse(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/drive"

    presign = await client.post(
        f"{base}/presign-upload",
        json={"filename": "floor-plan.pdf", "content_type": "application/pdf", "size_bytes": 12},
        headers=h,
    )
    object_id = presign.json()["data"]["object_id"]

    first = await client.post(f"{base}/files", json={"object_id": object_id}, headers=h)
    assert first.status_code == 201, first.text
    assert first.json()["data"]["name"] == "floor-plan.pdf"

    again = await client.post(f"{base}/files", json={"object_id": object_id}, headers=h)
    assert again.status_code == 400
    assert "already in the Drive" in again.json()["message"]


async def test_rejects_object_reserved_for_another_entity(client: AsyncClient) -> None:
    """A comment attachment cannot be laundered into the Drive."""
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    presign = await client.post(
        f"{API}/orgs/{org['id']}/storage/presign-upload",
        json={
            "entity_type": "comment",
            "filename": "note.pdf",
            "content_type": "application/pdf",
            "size_bytes": 10,
        },
        headers=h,
    )
    created = await client.post(
        f"{API}/orgs/{org['id']}/drive/files",
        json={"object_id": presign.json()["data"]["object_id"]},
        headers=h,
    )
    assert created.status_code == 400
    assert "not reserved for the Drive" in created.json()["message"]


async def test_hundred_megabyte_ceiling(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/drive"

    limit = 100 * 1024 * 1024
    assert get_settings().file_size_limit_bytes == limit

    ok_at_limit = await client.post(
        f"{base}/presign-upload",
        json={"filename": "big.pdf", "content_type": "application/pdf", "size_bytes": limit},
        headers=h,
    )
    assert ok_at_limit.status_code == 201, ok_at_limit.text

    too_big = await client.post(
        f"{base}/presign-upload",
        json={"filename": "huge.pdf", "content_type": "application/pdf", "size_bytes": limit + 1},
        headers=h,
    )
    assert too_big.status_code == 400
    assert "limit" in too_big.json()["message"].lower()


async def test_drive_is_scoped_to_its_organization(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    first = await create_org(client, owner["headers"])
    second = await create_org(client, owner["headers"], name="Other")

    file = await _upload(client, owner["headers"], first["id"], name="Acme MSA")

    listed = await client.get(f"{API}/orgs/{second['id']}/drive/files", headers=owner["headers"])
    assert listed.json()["data"]["items"] == []
    crossed = await client.get(
        f"{API}/orgs/{second['id']}/drive/files/{file['id']}", headers=owner["headers"]
    )
    assert crossed.status_code == 404


async def test_guest_reads_but_cannot_write(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    guest = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], guest, role="guest")

    file = await _upload(client, owner["headers"], org["id"], name="Acme MSA")
    base = f"{API}/orgs/{org['id']}/drive"

    readable = await client.get(f"{base}/files/{file['id']}", headers=guest["headers"])
    assert readable.status_code == 200

    blocked = await client.post(
        f"{base}/presign-upload",
        json={"filename": "x.pdf", "content_type": "application/pdf", "size_bytes": 10},
        headers=guest["headers"],
    )
    assert blocked.status_code == 403
    assert (
        await client.delete(f"{base}/files/{file['id']}", headers=guest["headers"])
    ).status_code == 403


async def test_reads_a_text_document_through_the_api(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The preview path: the API decodes the bytes so the browser needs no CORS."""
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/drive"

    body = "Clause 1. Readable.\nClause 2. Also readable."

    async def fake_get(key: str) -> bytes:
        return body.encode()

    monkeypatch.setattr(storage_client, "get_bytes", fake_get)

    file = await _upload(
        client, h, org["id"], filename="terms.txt", content_type="text/plain", name="Terms"
    )

    whole = await client.get(f"{base}/files/{file['id']}/text", headers=h)
    assert whole.status_code == 200, whole.text
    data = whole.json()["data"]
    assert data["readable"] is True
    assert data["text"] == body
    assert data["truncated"] is False
    assert data["total_chars"] == len(body)

    window = await client.get(
        f"{base}/files/{file['id']}/text", params={"offset": 0, "limit": 8}, headers=h
    )
    assert window.json()["data"]["text"] == body[:8]
    assert window.json()["data"]["truncated"] is True


async def test_text_endpoint_refuses_a_binary_document(client: AsyncClient) -> None:
    """A PDF reports readable=false with a URL instead of a wall of bytes."""
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    file = await _upload(client, h, org["id"], filename="plan.pdf", name="Plan")
    read = await client.get(f"{API}/orgs/{org['id']}/drive/files/{file['id']}/text", headers=h)
    assert read.status_code == 200, read.text
    data = read.json()["data"]
    assert data["readable"] is False
    assert data["text"] is None
    assert data["url"].startswith("https://r2.test/get/")
    assert "not plain text" in data["reason"]
