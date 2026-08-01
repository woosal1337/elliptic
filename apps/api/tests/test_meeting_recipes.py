"""Meeting recipes: save custom recipes and run them against a meeting (SAFE-04)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, import_meeting, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


def _recipes(org_id: str) -> str:
    return f"{API}/orgs/{org_id}/ai/meeting-recipes"


class CapturingProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(
            content="- task one\n- task two", model=model, input_tokens=3, output_tokens=2
        )


async def test_save_and_list_custom_recipe(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        _recipes(org["id"]),
        json={"name": "Risks", "prompt": "List the risks raised in this meeting."},
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    body = created.json()["data"]
    assert body["name"] == "Risks"
    assert body["built_in"] is False
    listing = await client.get(_recipes(org["id"]), headers=auth["headers"])
    assert [r["name"] for r in listing.json()["data"]] == ["Risks"]


async def test_duplicate_recipe_name_conflicts(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    body = {"name": "Risks", "prompt": "List risks."}
    assert (
        await client.post(_recipes(org["id"]), json=body, headers=auth["headers"])
    ).status_code == 201
    assert (
        await client.post(_recipes(org["id"]), json=body, headers=auth["headers"])
    ).status_code == 409


async def test_run_recipe_executes_prompt_over_transcript(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
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
    meeting = await import_meeting(client, auth["headers"], org["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/recipes/run",
        json={"prompt": "Create tasks from the action items."},
        headers=auth["headers"],
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["reply"] == "- task one\n- task two"
    prompt = "\n".join(message["content"] for message in fake.calls[0])
    assert "Create tasks from the action items." in prompt
    assert "Segment text number 0" in prompt
