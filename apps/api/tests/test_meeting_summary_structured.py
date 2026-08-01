"""Structured, source-anchored meeting summaries (MA-03-STRUCTURED)."""

import json
import re

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from elliptic.modules.meetings.service import _parse_summary_lines
from tests.helpers import API, create_org, import_meeting, register_and_login

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"
_SEGMENT_RE = re.compile(r"\[([0-9a-fA-F-]{36})\]")
_BOGUS_ID = "00000000-0000-0000-0000-000000000000"


def test_parse_summary_lines_filters_unknown_ids() -> None:
    raw = json.dumps(
        [
            {"text": "Decision made", "segment_ids": ["a", "b"]},
            {"text": "Highlight", "segment_ids": ["b", "zzz"]},
            {"text": "  ", "segment_ids": []},
        ]
    )
    lines = _parse_summary_lines(raw, valid_segment_ids={"a", "b"})
    assert lines == [
        {"text": "Decision made", "section": "", "provenance": "ai", "segment_ids": ["a", "b"]},
        {"text": "Highlight", "section": "", "provenance": "ai", "segment_ids": ["b"]},
    ]


def test_parse_summary_lines_handles_code_fences() -> None:
    raw = '```json\n[{"text": "X", "section": "Highlights", "segment_ids": []}]\n```'
    assert _parse_summary_lines(raw, set()) == [
        {"text": "X", "section": "Highlights", "provenance": "ai", "segment_ids": []}
    ]


def test_parse_summary_lines_returns_none_for_markdown() -> None:
    assert _parse_summary_lines("## Summary\n- a point", {"a"}) is None
    assert _parse_summary_lines('{"not": "a list"}', set()) is None


class StructuredFakeProvider:
    """Provider stub that cites the first real segment id plus one bogus id."""

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        joined = "\n".join(message["content"] for message in messages)
        found = _SEGMENT_RE.findall(joined)
        first = found[0] if found else _BOGUS_ID
        content = json.dumps(
            [
                {"text": "Decision: ship it", "segment_ids": [first]},
                {"text": "Unsourced highlight", "segment_ids": [_BOGUS_ID]},
            ]
        )
        return CompletionResult(content=content, model=model, input_tokens=10, output_tokens=5)


async def _org_with_key(client: AsyncClient) -> tuple[dict[str, str], str]:
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


async def test_summarize_stores_source_anchored_lines(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: StructuredFakeProvider(),
    )
    headers, org_id = await _org_with_key(client)
    meeting = await import_meeting(client, headers, org_id)

    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/summarize", json={}, headers=headers
    )
    assert response.status_code == 201, response.text
    summary = response.json()["data"]
    lines = summary["summary_lines"]
    assert lines is not None
    assert [line["text"] for line in lines] == ["Decision: ship it", "Unsourced highlight"]
    assert len(lines[0]["segment_ids"]) == 1
    assert lines[1]["segment_ids"] == []
    assert summary["content"] == "Decision: ship it\nUnsourced highlight"

    segments = await client.get(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/segments", headers=headers
    )
    valid_ids = {segment["id"] for segment in segments.json()["data"]["items"]}
    assert lines[0]["segment_ids"][0] in valid_ids
