"""Re-enhance a summary while preserving human-edited lines (MA-09)."""

import json

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from elliptic.modules.meetings.models import MeetingSummary
from tests.helpers import API, create_org, import_meeting, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


class StructuredFake:
    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        content = json.dumps(
            [
                {"text": "AI line one", "section": "Highlights", "segment_ids": []},
                {"text": "AI line two", "section": "Highlights", "segment_ids": []},
            ]
        )
        return CompletionResult(content=content, model=model, input_tokens=4, output_tokens=2)


async def test_reenhance_preserves_human_lines(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: StructuredFake(),
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
    first = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/summarize",
        json={},
        headers=auth["headers"],
    )
    assert first.status_code == 201, first.text

    async with session_factory() as session:
        summary = (await session.scalars(select(MeetingSummary))).one()
        lines = list(summary.summary_lines or [])
        lines[0] = {**lines[0], "text": "HUMAN EDIT", "provenance": "human"}
        summary.summary_lines = lines
        await session.commit()

    second = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/summarize",
        json={"preserve_human": True},
        headers=auth["headers"],
    )
    assert second.status_code == 201, second.text
    summary_lines = second.json()["data"]["summary_lines"]
    texts = [line["text"] for line in summary_lines]
    assert texts[0] == "HUMAN EDIT"
    assert summary_lines[0]["provenance"] == "human"
    assert "AI line one" in texts


async def test_reenhance_without_flag_does_not_preserve(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: StructuredFake(),
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
    await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/summarize",
        json={},
        headers=auth["headers"],
    )
    async with session_factory() as session:
        summary = (await session.scalars(select(MeetingSummary))).one()
        lines = list(summary.summary_lines or [])
        lines[0] = {**lines[0], "text": "HUMAN EDIT", "provenance": "human"}
        summary.summary_lines = lines
        await session.commit()

    second = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/summarize",
        json={},
        headers=auth["headers"],
    )
    texts = [line["text"] for line in second.json()["data"]["summary_lines"]]
    assert "HUMAN EDIT" not in texts
