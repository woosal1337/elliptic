"""Public meeting share: tokens, tiered guest access, revoke, guest chat (SAFE-01)."""

import json
from types import SimpleNamespace

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from elliptic.modules.meetings.service import extract_action_items_decisions
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    import_meeting,
    register_and_login,
)

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


def test_extract_from_sections() -> None:
    summary = SimpleNamespace(
        summary_lines=[
            {"text": "Ship it", "section": "Decisions", "segment_ids": []},
            {"text": "Alice writes docs", "section": "Action items", "segment_ids": []},
            {"text": "Good energy", "section": "Highlights", "segment_ids": []},
        ],
        content="",
    )
    actions, decisions = extract_action_items_decisions(summary)  # type: ignore[arg-type]
    assert decisions == ["Ship it"]
    assert actions == ["Alice writes docs"]


def test_extract_from_markdown_fallback() -> None:
    summary = SimpleNamespace(
        summary_lines=None,
        content="## Decisions\n- Ship it\n## Action Items\n- Do the thing",
    )
    actions, decisions = extract_action_items_decisions(summary)  # type: ignore[arg-type]
    assert decisions == ["Ship it"]
    assert actions == ["Do the thing"]


class SectionedFakeProvider:
    """Returns a structured, sectioned summary regardless of input."""

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        content = json.dumps(
            [
                {"text": "Ship the redesign", "section": "Decisions", "segment_ids": []},
                {"text": "Alice updates the docs", "section": "Action items", "segment_ids": []},
                {"text": "Strong sprint", "section": "Highlights", "segment_ids": []},
            ]
        )
        return CompletionResult(content=content, model=model, input_tokens=8, output_tokens=4)


async def _meeting_with_summary(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> tuple[dict[str, str], str, str]:
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: SectionedFakeProvider(),
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
    summarized = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/summarize",
        json={},
        headers=auth["headers"],
    )
    assert summarized.status_code == 201, summarized.text
    return auth["headers"], org["id"], meeting["id"]


async def test_create_get_and_revoke_share(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id, meeting_id = await _meeting_with_summary(client, monkeypatch)
    base = f"{API}/orgs/{org_id}/meetings/{meeting_id}/share"

    assert (await client.get(base, headers=headers)).json()["data"] is None

    created = await client.post(base, json={"include_transcript": False}, headers=headers)
    assert created.status_code == 201, created.text
    token = created.json()["data"]["token"]
    assert created.json()["data"]["revoked"] is False

    fetched = await client.get(base, headers=headers)
    assert fetched.json()["data"]["token"] == token

    revoked = await client.patch(base, json={"revoked": True}, headers=headers)
    assert revoked.json()["data"]["revoked"] is True


async def test_public_view_gates_transcript(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id, meeting_id = await _meeting_with_summary(client, monkeypatch)
    base = f"{API}/orgs/{org_id}/meetings/{meeting_id}/share"
    token = (await client.post(base, json={"include_transcript": False}, headers=headers)).json()[
        "data"
    ]["token"]

    public = await client.get(f"{API}/share/meetings/{token}")
    assert public.status_code == 200, public.text
    data = public.json()["data"]
    assert data["meeting_title"]
    assert data["decisions"] == ["Ship the redesign"]
    assert data["action_items"] == ["Alice updates the docs"]
    assert data["include_transcript"] is False
    assert data["transcript"] == []

    await client.patch(base, json={"include_transcript": True}, headers=headers)
    with_transcript = await client.get(f"{API}/share/meetings/{token}")
    assert with_transcript.json()["data"]["include_transcript"] is True
    assert len(with_transcript.json()["data"]["transcript"]) > 0


async def test_revoked_share_is_not_publicly_available(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id, meeting_id = await _meeting_with_summary(client, monkeypatch)
    base = f"{API}/orgs/{org_id}/meetings/{meeting_id}/share"
    token = (await client.post(base, json={}, headers=headers)).json()["data"]["token"]
    await client.patch(base, json={"revoked": True}, headers=headers)
    assert (await client.get(f"{API}/share/meetings/{token}")).status_code == 404
    assert (await client.get(f"{API}/share/meetings/does-not-exist")).status_code == 404


async def test_public_chat_answers_on_owner_key(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id, meeting_id = await _meeting_with_summary(client, monkeypatch)
    base = f"{API}/orgs/{org_id}/meetings/{meeting_id}/share"
    token = (await client.post(base, json={"include_transcript": True}, headers=headers)).json()[
        "data"
    ]["token"]

    reply = await client.post(
        f"{API}/share/meetings/{token}/chat",
        json={"messages": [{"role": "user", "content": "What was decided?"}]},
    )
    assert reply.status_code == 200, reply.text
    data = reply.json()["data"]
    assert data["reply"]
    assert data["grounded"] is True


async def test_only_creator_or_admin_can_share(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    meeting = await import_meeting(client, owner["headers"], org["id"])
    response = await client.post(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/share",
        json={"include_transcript": False},
        headers=member["headers"],
    )
    assert response.status_code in (403, 404), response.text
