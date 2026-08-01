"""BYOK key custody and AI feature tests with mocked providers."""

import json
import uuid

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.core.exceptions import BadGatewayError
from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.models import AIProviderKey, AIProviderType, AIRun, AIRunStatus
from elliptic.modules.ai.providers import ChatMessage, CompletionResult, OpenAIProvider
from elliptic.modules.meetings.models import MeetingSummary
from tests.helpers import API, create_org, import_meeting, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


class FakeProvider:
    """Deterministic provider stub recording the messages it receives."""

    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(
            content="## Summary\n- decided things", model=model, input_tokens=42, output_tokens=7
        )


class FailingProvider:
    """Provider stub that always fails the upstream call."""

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        raise BadGatewayError("Provider is unavailable")


async def _setup_org_with_key(client: AsyncClient) -> tuple[dict[str, str], str]:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={
            "provider": "openai",
            "name": "primary",
            "api_key": PLAINTEXT_KEY,
            "is_default": True,
        },
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    return auth["headers"], org["id"]


async def test_byo_llm_provider_config(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={
            "provider": "ollama",
            "name": "local-ollama",
            "api_key": PLAINTEXT_KEY,
            "base_url": "http://localhost:11434/v1",
            "chat_model": "llama3.1",
            "embedding_model": "nomic-embed-text",
            "embedding_dimensions": 768,
        },
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    data = created.json()["data"]
    assert data["provider"] == "ollama"
    assert data["base_url"] == "http://localhost:11434/v1"
    assert data["chat_model"] == "llama3.1"
    assert data["embedding_dimensions"] == 768
    assert "api_key" not in data

    updated = await client.patch(
        f"{API}/orgs/{org['id']}/ai/keys/{data['id']}",
        json={"chat_model": "llama3.2"},
        headers=auth["headers"],
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["data"]["chat_model"] == "llama3.2"


async def test_create_key_masked_and_encrypted(client: AsyncClient) -> None:
    headers, org_id = await _setup_org_with_key(client)
    listing = await client.get(f"{API}/orgs/{org_id}/ai/keys", headers=headers)
    assert listing.status_code == 200
    key_row = listing.json()["data"][0]
    assert key_row["last4"] == PLAINTEXT_KEY[-4:]
    assert key_row["is_default"] is True
    serialized = json.dumps(listing.json())
    assert PLAINTEXT_KEY not in serialized
    assert "encrypted_key" not in key_row
    assert "nonce" not in key_row

    async with session_factory() as session:
        stored = (await session.scalars(select(AIProviderKey))).one()
        assert stored.encrypted_key != PLAINTEXT_KEY.encode()
        assert ai_service.decrypt_key(stored) == PLAINTEXT_KEY


async def test_summarize_writes_summary_and_run(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = FakeProvider()
    captured: dict[str, str] = {}

    def fake_get_provider(
        provider: AIProviderType,
        api_key: str,
        transport: httpx.AsyncBaseTransport | None = None,
        base_url: str | None = None,
    ) -> FakeProvider:
        captured["api_key"] = api_key
        captured["provider"] = provider
        return fake

    monkeypatch.setattr(ai_service, "get_provider", fake_get_provider)
    headers, org_id = await _setup_org_with_key(client)
    meeting = await import_meeting(client, headers, org_id)

    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/summarize", json={}, headers=headers
    )
    assert response.status_code == 201, response.text
    summary = response.json()["data"]
    assert summary["content"].startswith("## Summary")
    assert summary["provider"] == "openai"
    assert captured["api_key"] == PLAINTEXT_KEY
    assert any("Segment text number 0" in m["content"] for m in fake.calls[0])

    async with session_factory() as session:
        run = (await session.scalars(select(AIRun))).one()
        assert run.status == AIRunStatus.SUCCEEDED
        assert run.input_tokens == 42
        assert run.output_tokens == 7
        stored_summary = (await session.scalars(select(MeetingSummary))).one()
        assert str(stored_summary.ai_run_id) == str(run.id)

    feed = await client.get(
        f"{API}/orgs/{org_id}/activity/meeting/{meeting['id']}", headers=headers
    )
    event_types = [event["event_type"] for event in feed.json()["data"]["items"]]
    assert "summarized" in event_types


async def test_chat_grounded_on_transcript(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = FakeProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    headers, org_id = await _setup_org_with_key(client)
    meeting = await import_meeting(client, headers, org_id)

    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/chat",
        json={"messages": [{"role": "user", "content": "What was decided?"}]},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["reply"].startswith("## Summary")
    assert uuid.UUID(data["ai_run_id"])
    transcript_context = "\n".join(m["content"] for m in fake.calls[0])
    assert "Segment text number 1" in transcript_context

    async with session_factory() as session:
        run = (await session.scalars(select(AIRun))).one()
        assert run.purpose == "chat"


async def test_failed_provider_records_run_and_returns_502(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: FailingProvider(),
    )
    headers, org_id = await _setup_org_with_key(client)
    meeting = await import_meeting(client, headers, org_id)

    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/summarize", json={}, headers=headers
    )
    assert response.status_code == 502, response.text

    async with session_factory() as session:
        run = (await session.scalars(select(AIRun))).one()
        assert run.status == AIRunStatus.FAILED
        assert run.error == "Provider is unavailable"
        summaries = (await session.scalars(select(MeetingSummary))).all()
        assert summaries == []


async def test_update_key_name_conflict_returns_409(client: AsyncClient) -> None:
    headers, org_id = await _setup_org_with_key(client)
    second = await client.post(
        f"{API}/orgs/{org_id}/ai/keys",
        json={"provider": "anthropic", "name": "secondary", "api_key": "sk-ant-xxxxyyyy"},
        headers=headers,
    )
    assert second.status_code == 201, second.text
    second_id = second.json()["data"]["id"]
    conflict = await client.patch(
        f"{API}/orgs/{org_id}/ai/keys/{second_id}",
        json={"name": "primary"},
        headers=headers,
    )
    assert conflict.status_code == 409


async def test_update_ai_user_name_conflict_returns_409(client: AsyncClient) -> None:
    headers, org_id = await _setup_org_with_key(client)
    first = await client.post(
        f"{API}/orgs/{org_id}/ai/users",
        json={
            "name": "Alpha",
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are Alpha.",
        },
        headers=headers,
    )
    assert first.status_code == 201, first.text
    second = await client.post(
        f"{API}/orgs/{org_id}/ai/users",
        json={
            "name": "Beta",
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are Beta.",
        },
        headers=headers,
    )
    assert second.status_code == 201, second.text
    second_id = second.json()["data"]["id"]
    conflict = await client.patch(
        f"{API}/orgs/{org_id}/ai/users/{second_id}",
        json={"name": "Alpha"},
        headers=headers,
    )
    assert conflict.status_code == 409


async def test_summarize_without_key_fails(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    meeting = await import_meeting(client, auth["headers"], org["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/summarize",
        json={},
        headers=auth["headers"],
    )
    assert response.status_code == 400


async def test_openai_provider_with_mock_transport() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == f"Bearer {PLAINTEXT_KEY}"
        body = json.loads(request.content)
        assert body["model"] == "gpt-4o-mini"
        return httpx.Response(
            200,
            json={
                "model": "gpt-4o-mini",
                "choices": [{"message": {"role": "assistant", "content": "hello"}}],
                "usage": {"prompt_tokens": 3, "completion_tokens": 2},
            },
        )

    provider = OpenAIProvider(PLAINTEXT_KEY, transport=httpx.MockTransport(handler))
    result = await provider.complete(
        [{"role": "user", "content": "hi"}], model="gpt-4o-mini", max_tokens=64
    )
    assert result.content == "hello"
    assert result.input_tokens == 3
    assert result.output_tokens == 2
