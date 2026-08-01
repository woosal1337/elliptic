"""Cross-meeting chat + retrieval (MA-14/MA-11) and meeting filing suggestion (MA-18)."""

from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, create_project, create_task, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


class CapturingProvider:
    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(
            content="Here is what I found.", model=model, input_tokens=5, output_tokens=3
        )


async def _import(
    client: AsyncClient, headers: dict[str, str], org_id: str, title: str, texts: list[str]
) -> dict[str, str]:
    payload = {
        "title": title,
        "started_at": datetime.now(UTC).isoformat(),
        "duration_seconds": 600,
        "attendees": [],
        "markdown": f"# {title}",
        "segments": [
            {"speaker": "A", "start_seconds": i * 10.0, "end_seconds": i * 10.0 + 9, "text": text}
            for i, text in enumerate(texts)
        ],
    }
    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/import", json=payload, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


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


async def test_cross_meeting_chat_cites_only_relevant_meeting(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    headers, org_id = await _org_with_key(client)
    pricing = await _import(
        client,
        headers,
        org_id,
        "Pricing strategy",
        ["We should raise pricing for enterprise", "Discount tiers need rework"],
    )
    await _import(
        client, headers, org_id, "Hiring plan", ["We need two backend engineers", "Onboarding"]
    )

    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/chat",
        json={"messages": [{"role": "user", "content": "What did we decide about pricing?"}]},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["reply"] == "Here is what I found."
    cited_meetings = {c["meeting_id"] for c in data["citations"]}
    assert cited_meetings == {pricing["id"]}
    assert data["coverage"] == {"consulted": 1, "total": 2}
    assert data["citations"][0]["segment_id"] is not None


async def test_cross_meeting_chat_scope_by_project(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    headers, org_id = await _org_with_key(client)
    await _import(client, headers, org_id, "Pricing strategy", ["raise pricing for enterprise"])

    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/chat",
        json={
            "messages": [{"role": "user", "content": "pricing"}],
            "scope": {"from": "2099-01-01T00:00:00Z"},
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["coverage"] == {"consulted": 0, "total": 0}


async def test_suggest_project_for_meeting(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    mobile = await create_project(client, auth["headers"], org["id"], key="MOB", name="Mobile App")
    await create_project(client, auth["headers"], org["id"], key="OPS", name="Operations")
    meeting = await _import(
        client, auth["headers"], org["id"], "Mobile app launch review", ["mobile app rollout"]
    )
    response = await client.get(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/suggest-project",
        headers=auth["headers"],
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["project_id"] == mobile["id"]
    assert data["confidence"] > 0


async def test_create_task_is_project_scoped_title_only(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="BTT")
    task = await create_task(
        client, auth["headers"], org["id"], project["id"], title="Just a title"
    )
    assert task["title"] == "Just a title"
    assert task["status"] == "backlog"
    assert task["category"] == "backlog"
