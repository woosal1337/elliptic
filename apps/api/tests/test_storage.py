"""Private + presigned object storage (COS-255)."""

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.modules.storage import client as storage_client
from elliptic.modules.storage import service as storage_service
from tests.helpers import API, create_org, register_and_login


@pytest.fixture(autouse=True)
def _configure_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make storage appear configured + stub R2 network so tests stay hermetic."""
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
        return {"size": 1234, "etag": "abc123", "content_type": "image/png"}

    async def fake_delete(key: str) -> None:
        return None

    monkeypatch.setattr(storage_client, "head_object", fake_head)
    monkeypatch.setattr(storage_client, "delete_object", fake_delete)


async def test_presigned_upload_confirm_download(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/storage"

    presign = await client.post(
        base + "/presign-upload",
        json={
            "entity_type": "general",
            "filename": "logo.png",
            "content_type": "image/png",
            "size_bytes": 1234,
        },
        headers=h,
    )
    assert presign.status_code == 201, presign.text
    data = presign.json()["data"]
    object_id = data["object_id"]
    assert data["upload_url"].startswith("https://r2.test/put/orgs/")
    assert "logo.png" in data["storage_key"]

    confirm = await client.post(f"{base}/objects/{object_id}/confirm", headers=h)
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["data"]["is_uploaded"] is True
    assert confirm.json()["data"]["kind"] == "image"
    assert confirm.json()["data"]["size_bytes"] == 1234

    dl = await client.get(f"{base}/objects/{object_id}/download", headers=h)
    assert dl.status_code == 200, dl.text
    assert dl.json()["data"]["download_url"].startswith("https://r2.test/get/")

    assert (await client.delete(f"{base}/objects/{object_id}", headers=h)).status_code == 200
    assert (await client.get(f"{base}/objects/{object_id}", headers=h)).status_code == 404


async def test_rejects_oversize_and_bad_type(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/storage"

    bad_type = await client.post(
        base + "/presign-upload",
        json={"filename": "x.exe", "content_type": "application/x-msdownload", "size_bytes": 10},
        headers=h,
    )
    assert bad_type.status_code == 400
    assert "not allowed" in bad_type.json()["message"].lower()

    limit = get_settings().file_size_limit_bytes
    too_big = await client.post(
        base + "/presign-upload",
        json={"filename": "big.pdf", "content_type": "application/pdf", "size_bytes": limit + 1},
        headers=h,
    )
    assert too_big.status_code == 400
    assert "limit" in too_big.json()["message"].lower()


async def test_confirm_size_recheck_deletes(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the actually-uploaded object exceeds the limit, confirm rejects + cleans up."""
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/storage"

    presign = await client.post(
        base + "/presign-upload",
        json={"filename": "ok.pdf", "content_type": "application/pdf", "size_bytes": 10},
        headers=h,
    )
    object_id = presign.json()["data"]["object_id"]

    async def big_head(key: str) -> dict[str, object]:
        return {
            "size": get_settings().file_size_limit_bytes + 999,
            "etag": "e",
            "content_type": "application/pdf",
        }

    monkeypatch.setattr(storage_service.client, "head_object", big_head)
    confirm = await client.post(f"{base}/objects/{object_id}/confirm", headers=h)
    assert confirm.status_code == 400
    obj = await client.get(f"{base}/objects/{object_id}", headers=h)
    assert obj.status_code == 200
    assert obj.json()["data"]["is_uploaded"] is False
    assert (await client.get(f"{base}/objects/{object_id}/download", headers=h)).status_code == 404


async def test_list_objects_for_entity(client: AsyncClient) -> None:
    import uuid as _uuid  # noqa: PLC0415

    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/storage"
    entity_id = str(_uuid.uuid4())

    p = await client.post(
        base + "/presign-upload",
        json={
            "entity_type": "note",
            "entity_id": entity_id,
            "filename": "a.png",
            "content_type": "image/png",
            "size_bytes": 10,
        },
        headers=h,
    )
    oid = p.json()["data"]["object_id"]
    await client.post(f"{base}/objects/{oid}/confirm", headers=h)

    listed = await client.get(
        base + "/objects", params={"entity_type": "note", "entity_id": entity_id}, headers=h
    )
    assert listed.status_code == 200, listed.text
    assert [o["id"] for o in listed.json()["data"]] == [oid]
