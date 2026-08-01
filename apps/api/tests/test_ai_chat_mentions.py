"""@entity mentions scope a chat message (COS-227)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, create_task, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class CapturingProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(content="noted", model=model, input_tokens=1, output_tokens=1)


async def test_mention_injects_context(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    task = await create_task(client, h, org["id"], project["id"], title="Refactor billing module")
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    convo = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations", json={"mode": "ask"}, headers=h
    )
    cid = convo.json()["data"]["id"]

    sent = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations/{cid}/messages",
        json={
            "content": "what's the status of this?",
            "mentions": [{"type": "task", "id": task["id"]}],
        },
        headers=h,
    )
    assert sent.status_code == 201, sent.text
    system_blocks = " ".join(m["content"] for m in fake.calls[0] if m["role"] == "system")
    assert "Refactor billing module" in system_blocks
