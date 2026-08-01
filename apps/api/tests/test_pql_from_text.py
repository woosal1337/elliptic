"""Text-to-PQL (COS-163)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, create_task, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class PqlProvider:
    def __init__(self, out: str) -> None:
        self.out = out

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        return CompletionResult(content=self.out, model=model, input_tokens=5, output_tokens=10)


async def test_text_to_pql_generates_and_runs(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="NLP")
    await create_task(
        client, h, org["id"], project["id"], title="Crash on save", kind="bug", severity="high"
    )
    await create_task(client, h, org["id"], project["id"], title="A normal task")
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )

    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: PqlProvider('kind = "bug"'),
    )
    res = await client.post(
        f"{API}/orgs/{org['id']}/pql/from-text",
        json={"prompt": "show me all the bugs"},
        headers=h,
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["query"] == 'kind = "bug"'
    assert data["count"] == 1
    assert data["results"][0]["title"] == "Crash on save"

    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: PqlProvider("totally not pql"),
    )
    bad = await client.post(
        f"{API}/orgs/{org['id']}/pql/from-text", json={"prompt": "junk"}, headers=h
    )
    assert bad.status_code == 400
