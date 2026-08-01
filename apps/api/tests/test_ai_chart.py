"""AI inline charts grounded in real data (COS-237)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, create_task, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class JsonProvider:
    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        return CompletionResult(
            content='{"metric": "count", "dimension": "status", "title": "Items by status"}',
            model=model,
            input_tokens=5,
            output_tokens=10,
        )

    async def complete_structured(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        schema_name: str,
        json_schema: dict[str, object],
    ) -> CompletionResult:
        return await self.complete(messages, model=model, max_tokens=max_tokens)


async def test_ai_chart_uses_real_counts(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    await create_task(client, h, org["id"], project["id"], title="A")
    await create_task(client, h, org["id"], project["id"], title="B")
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: JsonProvider(),
    )

    res = await client.post(
        f"{API}/orgs/{org['id']}/ai/chart", json={"prompt": "show items by status"}, headers=h
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["dimension"] == "status"
    assert data["title"] == "Items by status"
    total = sum(p["value"] for p in data["points"])
    assert total == 2
