"""Auto-run Build-mode actions + toggle (COS-221)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class ActionProvider:
    def __init__(self, key: str) -> None:
        self.key = key

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        body = (
            '{"action": "create_task", "project_key": "' + self.key + '", '
            '"title": "Ship the changelog", "priority": "medium"}'
        )
        return CompletionResult(content=body, model=model, input_tokens=5, output_tokens=15)

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


async def test_auto_run_toggle_and_execute(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: ActionProvider(project["key"]),
    )

    convo = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations", json={"mode": "build"}, headers=h
    )
    cid = convo.json()["data"]["id"]
    assert convo.json()["data"]["auto_run"] is False

    toggled = await client.patch(
        f"{API}/orgs/{org['id']}/ai/conversations/{cid}", json={"auto_run": True}, headers=h
    )
    assert toggled.json()["data"]["auto_run"] is True

    ran = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations/{cid}/run-action",
        json={"prompt": "create a task to ship the changelog"},
        headers=h,
    )
    assert ran.status_code == 201, ran.text
    entry = ran.json()["data"]
    assert "Ship the changelog" in entry["summary"]
    assert entry["result"]["identifier"].startswith(project["key"])

    tasks = await client.get(f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks", headers=h)
    assert any(t["title"] == "Ship the changelog" for t in tasks.json()["data"]["items"])


async def test_auto_run_requires_build_mode(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    convo = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations", json={"mode": "ask"}, headers=h
    )
    cid = convo.json()["data"]["id"]
    res = await client.post(
        f"{API}/orgs/{org['id']}/ai/conversations/{cid}/run-action",
        json={"prompt": "do something"},
        headers=h,
    )
    assert res.status_code == 400
