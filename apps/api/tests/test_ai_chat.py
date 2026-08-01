"""AI chat conversations — Ask/Build (COS-206)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


class ChatProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(
            content="Hello from the assistant.", model=model, input_tokens=5, output_tokens=3
        )


async def _org_with_key(client: AsyncClient) -> tuple[dict[str, str], str]:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={
            "provider": "openai",
            "name": "primary",
            "api_key": PLAINTEXT_KEY,
            "is_default": True,
        },
        headers=auth["headers"],
    )
    return auth["headers"], org["id"]


async def test_chat_conversation_flow(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers, org_id = await _org_with_key(client)
    fake = ChatProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    convo = await client.post(
        f"{API}/orgs/{org_id}/ai/conversations", json={"mode": "ask"}, headers=headers
    )
    assert convo.status_code == 201, convo.text
    cid = convo.json()["data"]["id"]
    assert convo.json()["data"]["mode"] == "ask"

    sent = await client.post(
        f"{API}/orgs/{org_id}/ai/conversations/{cid}/messages",
        json={"content": "What can you do?"},
        headers=headers,
    )
    assert sent.status_code == 201, sent.text
    assert sent.json()["data"]["role"] == "assistant"
    assert sent.json()["data"]["content"] == "Hello from the assistant."

    assert "ASK mode" in fake.calls[0][0]["content"]

    msgs = await client.get(f"{API}/orgs/{org_id}/ai/conversations/{cid}/messages", headers=headers)
    roles = [m["role"] for m in msgs.json()["data"]]
    assert roles == ["user", "assistant"]

    listed = await client.get(f"{API}/orgs/{org_id}/ai/conversations", headers=headers)
    assert any(c["id"] == cid for c in listed.json()["data"])
    assert any(c["title"] == "What can you do?" for c in listed.json()["data"])

    deleted = await client.delete(f"{API}/orgs/{org_id}/ai/conversations/{cid}", headers=headers)
    assert deleted.status_code == 200
