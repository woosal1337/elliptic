"""Custom meeting templates: CRUD, admin gating, and summarize injection (MA-08)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    import_meeting,
    register_and_login,
)

PLAINTEXT_KEY = "sk-test-aaaabbbbccccdddd"


def _tpl(org_id: str) -> str:
    return f"{API}/orgs/{org_id}/ai/meeting-templates"


class CapturingProvider:
    """Records the prompt messages it is given."""

    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.calls.append(messages)
        return CompletionResult(content="## Summary", model=model, input_tokens=1, output_tokens=1)


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


async def test_template_crud(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    created = await client.post(
        _tpl(org["id"]),
        json={"name": "Sprint Review", "sections": ["Shipped", "Demo", "Next"]},
        headers=auth["headers"],
    )
    assert created.status_code == 201, created.text
    body = created.json()["data"]
    assert body["name"] == "Sprint Review"
    assert body["sections"] == ["Shipped", "Demo", "Next"]
    assert body["built_in"] is False
    template_id = body["id"]

    listing = await client.get(_tpl(org["id"]), headers=auth["headers"])
    assert [t["id"] for t in listing.json()["data"]] == [template_id]

    updated = await client.patch(
        f"{_tpl(org['id'])}/{template_id}",
        json={"sections": ["Shipped", "Demo", "Risks", "Next"]},
        headers=auth["headers"],
    )
    assert updated.json()["data"]["sections"] == ["Shipped", "Demo", "Risks", "Next"]

    deleted = await client.delete(f"{_tpl(org['id'])}/{template_id}", headers=auth["headers"])
    assert deleted.status_code == 200, deleted.text
    assert (await client.get(_tpl(org["id"]), headers=auth["headers"])).json()["data"] == []


async def test_duplicate_name_conflicts(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    body = {"name": "Sprint Review", "sections": ["A"]}
    first = await client.post(_tpl(org["id"]), json=body, headers=auth["headers"])
    assert first.status_code == 201, first.text
    second = await client.post(_tpl(org["id"]), json=body, headers=auth["headers"])
    assert second.status_code == 409, second.text


async def test_non_admin_cannot_create(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    response = await client.post(
        _tpl(org["id"]), json={"name": "X", "sections": []}, headers=member["headers"]
    )
    assert response.status_code == 403, response.text


async def test_builtin_template_id_injects_its_sections(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    headers, org_id = await _org_with_key(client)
    meeting = await import_meeting(client, headers, org_id)
    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/summarize",
        json={"template_id": "standup"},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    prompt = "\n".join(message["content"] for message in fake.calls[0])
    assert "Yesterday" in prompt
    assert "Today" in prompt
    assert "Blockers" in prompt


async def test_custom_template_id_injects_custom_sections(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    headers, org_id = await _org_with_key(client)
    created = await client.post(
        _tpl(org_id),
        json={"name": "Incident Review", "sections": ["Timeline", "Root cause", "Follow-ups"]},
        headers=headers,
    )
    template_id = created.json()["data"]["id"]
    meeting = await import_meeting(client, headers, org_id)
    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/summarize",
        json={"template_id": template_id},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    prompt = "\n".join(message["content"] for message in fake.calls[0])
    assert "Root cause" in prompt
    assert "Follow-ups" in prompt


async def test_freeform_template_adds_no_directive(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = CapturingProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    headers, org_id = await _org_with_key(client)
    meeting = await import_meeting(client, headers, org_id)
    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/{meeting['id']}/summarize",
        json={"template_id": "freeform"},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    prompt = "\n".join(message["content"] for message in fake.calls[0])
    assert "Organize the summary to cover these sections" not in prompt
