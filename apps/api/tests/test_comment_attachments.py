"""Comment attachments via presigned storage (COS-106)."""

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.modules.storage import client as storage_client
from tests.helpers import API, create_org, create_project, create_task, register_and_login


@pytest.fixture(autouse=True)
def _stub_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "r2_endpoint_url", "https://acct.r2.cloudflarestorage.com")
    monkeypatch.setattr(settings, "r2_access_key_id", "k")
    monkeypatch.setattr(settings, "r2_secret_access_key", "s")
    monkeypatch.setattr(
        storage_client, "presigned_put", lambda key, ct, **kw: f"https://r2/put/{key}"
    )
    monkeypatch.setattr(storage_client, "presigned_get", lambda key, **kw: f"https://r2/get/{key}")

    async def fake_head(key: str) -> dict[str, object]:
        return {"size": 2048, "etag": "e", "content_type": "image/png"}

    monkeypatch.setattr(storage_client, "head_object", fake_head)


async def _upload(client: AsyncClient, h: dict, org_id: str, name: str = "shot.png") -> str:
    base = f"{API}/orgs/{org_id}/storage"
    p = await client.post(
        base + "/presign-upload",
        json={"filename": name, "content_type": "image/png", "size_bytes": 2048},
        headers=h,
    )
    oid = p.json()["data"]["object_id"]
    await client.post(f"{base}/objects/{oid}/confirm", headers=h)
    return oid


async def test_comment_with_attachments(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    task = await create_task(client, h, org["id"], project["id"], title="needs a screenshot")

    obj_id = await _upload(client, h, org["id"])

    created = await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "task",
            "entity_id": task["id"],
            "content": "see attached",
            "attachment_ids": [obj_id],
        },
        headers=h,
    )
    assert created.status_code == 201, created.text
    attachments = created.json()["data"]["attachments"]
    assert len(attachments) == 1
    assert attachments[0]["filename"] == "shot.png"
    assert attachments[0]["kind"] == "image"

    listed = await client.get(
        f"{API}/orgs/{org['id']}/comments",
        params={"entity_type": "task", "entity_id": task["id"]},
        headers=h,
    )
    item = listed.json()["data"]["items"][0]
    assert item["attachments"][0]["id"] == obj_id

    dl = await client.get(f"{API}/orgs/{org['id']}/storage/objects/{obj_id}/download", headers=h)
    assert dl.status_code == 200
    assert dl.json()["data"]["download_url"].startswith("https://r2/get/")
