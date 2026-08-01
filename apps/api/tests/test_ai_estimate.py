"""AI-suggested estimates (COS-168)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, create_task, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class FixedProvider:
    def __init__(self, answer: str) -> None:
        self.answer = answer

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        return CompletionResult(content=self.answer, model=model, input_tokens=3, output_tokens=1)


async def test_ai_suggests_estimate_from_scale(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    await client.patch(
        f"{API}/orgs/{org['id']}/projects/{project['id']}",
        json={"estimate_scale": ["XS", "S", "M", "L", "XL"]},
        headers=h,
    )
    task = await create_task(
        client, h, org["id"], project["id"], title="Rewrite the auth flow end to end"
    )

    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: FixedProvider("L"),
    )
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )

    res = await client.post(
        f"{API}/orgs/{org['id']}/ai/suggest-estimate", json={"task_id": task["id"]}, headers=h
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["suggestion"] == "L"
    assert data["scale"] == ["XS", "S", "M", "L", "XL"]
    assert data["ai_run_id"]
