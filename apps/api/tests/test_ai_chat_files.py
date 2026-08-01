"""AI chat with file/image input — COS-211 backend (COS-291)."""

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from elliptic.modules.storage import client as storage_client
from tests.helpers import API, create_org, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class CapturingProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(content="Read it.", model=model, input_tokens=5, output_tokens=2)


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

    async def head(key: str) -> dict[str, object]:
        return {"size": 14, "etag": "e", "content_type": "text/plain"}

    async def get_bytes(key: str) -> bytes:
        return b"SECRET-PLAN-42"

    monkeypatch.setattr(storage_client, "head_object", head)
    monkeypatch.setattr(storage_client, "get_bytes", get_bytes)


async def test_chat_message_with_file_attachment(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    base = f"{API}/orgs/{org['id']}/storage"
    pres = await client.post(
        base + "/presign-upload",
        json={"filename": "plan.txt", "content_type": "text/plain", "size_bytes": 14},
        headers=h,
    )
    oid = pres.json()["data"]["object_id"]
    await client.post(f"{base}/objects/{oid}/confirm", headers=h)

    convo = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations", json={"mode": "ask"}, headers=h
    )
    cid = convo.json()["data"]["id"]

    sent = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations/{cid}/messages",
        json={"content": "summarize the attached file", "object_ids": [oid]},
        headers=h,
    )
    assert sent.status_code == 201, sent.text

    flat = " ".join(msg["content"] for call in fake.calls for msg in call)
    assert "SECRET-PLAN-42" in flat
    assert "plan.txt" in flat

    msgs = await client.get(f"{API}/orgs/{org['id']}/ai/conversations/{cid}/messages", headers=h)
    user_msg = next(m for m in msgs.json()["data"] if m["role"] == "user")
    assert user_msg["attachments"][0]["filename"] == "plan.txt"
    assert user_msg["attachments"][0]["kind"] == "file"
