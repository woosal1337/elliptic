"""Catch-up mark-seen + AI 'what changed' summary (COS-239)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, create_task, register_and_login

KEY = "sk-test-catchup-key-123456"


class FakeProvider:
    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        return CompletionResult(
            content="- Two tasks created\n- One moved to done",
            model=model,
            input_tokens=5,
            output_tokens=8,
        )


async def test_catchup_summary_and_mark_seen(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="CU")
    await create_task(client, h, org["id"], project["id"], title="one")
    await create_task(client, h, org["id"], project["id"], title="two")

    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: FakeProvider(),
    )
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )

    summary = await client.get(
        f"{API}/orgs/{org['id']}/notifications/catch-up/summary",
        params={"project_id": project["id"]},
        headers=h,
    )
    assert summary.status_code == 200, summary.text
    assert summary.json()["data"]["event_count"] >= 1
    assert "done" in summary.json()["data"]["summary"]

    seen = await client.post(
        f"{API}/orgs/{org['id']}/notifications/catch-up/mark-seen",
        json={"entity_type": "task"},
        headers=h,
    )
    assert seen.status_code == 200, seen.text
    assert "marked" in seen.json()["data"]
