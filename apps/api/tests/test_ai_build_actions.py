"""Build-mode AI actions: propose -> execute (COS-212)."""

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
            '"title": "Add rate limiting", "description": "protect the API", "priority": "high"}'
        )
        return CompletionResult(content=body, model=model, input_tokens=5, output_tokens=20)

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


async def test_propose_then_execute(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
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

    proposed = await client.post(
        f"{API}/orgs/{org['id']}/ai/propose-action",
        json={"prompt": "we need rate limiting on the api"},
        headers=h,
    )
    assert proposed.status_code == 200, proposed.text
    proposal = proposed.json()["data"]
    assert proposal["action"] == "create_task"
    assert proposal["params"]["title"] == "Add rate limiting"
    assert proposal["params"]["priority"] == "high"
    assert "Create work item" in proposal["summary"]

    executed = await client.post(
        f"{API}/orgs/{org['id']}/ai/execute-action",
        json={"action": proposal["action"], "params": proposal["params"]},
        headers=h,
    )
    assert executed.status_code == 201, executed.text
    result = executed.json()["data"]
    assert result["identifier"].startswith(project["key"])
    assert result["title"] == "Add rate limiting"

    tasks = await client.get(f"{API}/orgs/{org['id']}/projects/{project['id']}/tasks", headers=h)
    assert any(t["title"] == "Add rate limiting" for t in tasks.json()["data"]["items"])
