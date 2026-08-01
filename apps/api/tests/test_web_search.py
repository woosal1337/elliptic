"""Web search in the AI assistant (COS-258)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class SynthProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(
            content="CompanyOS is an AI-native work OS [1].",
            model=model,
            input_tokens=5,
            output_tokens=8,
        )


async def _async(value: list[dict[str, str]]) -> list[dict[str, str]]:
    return value


async def test_web_search_synthesizes_with_sources(
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
    fake = SynthProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    monkeypatch.setattr(
        ai_service,
        "fetch_web_results",
        lambda query: _async(
            [{"title": "CompanyOS", "snippet": "An AI-native OS", "url": "https://x"}]
        ),
    )

    res = await client.post(
        f"{API}/orgs/{org['id']}/ai/web-search", json={"query": "what is companyos"}, headers=h
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "[1]" in data["answer"]
    assert len(data["sources"]) == 1
    assert data["sources"][0]["url"] == "https://x"
    assert "AI-native OS" in " ".join(m["content"] for m in fake.calls[0])

    monkeypatch.setattr(ai_service, "fetch_web_results", lambda query: _async([]))
    empty = await client.post(
        f"{API}/orgs/{org['id']}/ai/web-search", json={"query": "zzz"}, headers=h
    )
    assert empty.json()["data"]["sources"] == []
