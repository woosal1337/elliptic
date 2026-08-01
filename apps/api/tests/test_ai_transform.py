"""In-editor AI text transform (COS-250)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


class EchoProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(
            content="Rewritten text.", model=model, input_tokens=4, output_tokens=2
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


async def test_transform_rephrase(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers, org_id = await _org_with_key(client)
    fake = EchoProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    response = await client.post(
        f"{API}/orgs/{org_id}/ai/transform",
        json={"text": "make this nicer", "action": "rephrase"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["result"] == "Rewritten text."
    assert data["ai_run_id"]
    assert fake.calls[0][-1]["content"] == "make this nicer"


async def test_ai_generate_with_context(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id = await _org_with_key(client)
    fake = EchoProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    response = await client.post(
        f"{API}/orgs/{org_id}/ai/generate",
        json={"prompt": "Summarize as a TL;DR", "context": "Long meeting notes here."},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["result"] == "Rewritten text."
    assert data["ai_run_id"]
    user_message = fake.calls[0][-1]["content"]
    assert "Long meeting notes here." in user_message
    assert "Summarize as a TL;DR" in user_message


async def test_ai_kill_switch_blocks_completion(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id = await _org_with_key(client)
    fake = EchoProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    disabled = await client.patch(
        f"{API}/orgs/{org_id}", json={"ai_enabled": False}, headers=headers
    )
    assert disabled.status_code == 200, disabled.text
    assert disabled.json()["data"]["ai_enabled"] is False

    blocked = await client.post(
        f"{API}/orgs/{org_id}/ai/transform",
        json={"text": "hi", "action": "rephrase"},
        headers=headers,
    )
    assert blocked.status_code == 403

    await client.patch(f"{API}/orgs/{org_id}", json={"ai_enabled": True}, headers=headers)
    allowed = await client.post(
        f"{API}/orgs/{org_id}/ai/transform",
        json={"text": "hi", "action": "rephrase"},
        headers=headers,
    )
    assert allowed.status_code == 200


async def test_transform_translate_includes_language(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id = await _org_with_key(client)
    fake = EchoProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )

    response = await client.post(
        f"{API}/orgs/{org_id}/ai/transform",
        json={"text": "hello", "action": "translate", "target_language": "Turkish"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert "Turkish" in fake.calls[0][0]["content"]
