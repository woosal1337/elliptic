"""AI chat conversation management: pin/rename/search + feedback (COS-231)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, register_and_login

KEY = "sk-test-aaaabbbbccccdddd"


class ChatProvider:
    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        return CompletionResult(content="ok", model=model, input_tokens=1, output_tokens=1)


async def _org(client: AsyncClient) -> tuple[dict[str, str], str]:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=auth["headers"],
    )
    return auth["headers"], org["id"]


async def test_pin_rename_search_and_feedback(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    h, org_id = await _org(client)
    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: ChatProvider(),
    )
    base = f"{API}/orgs/{org_id}/ai/conversations"

    a = (await client.post(base, json={"mode": "ask", "title": "Alpha topic"}, headers=h)).json()[
        "data"
    ]
    b = (await client.post(base, json={"mode": "ask", "title": "Beta topic"}, headers=h)).json()[
        "data"
    ]

    pinned = await client.patch(f"{base}/{b['id']}", json={"pinned": True}, headers=h)
    assert pinned.status_code == 200
    assert pinned.json()["data"]["pinned"] is True
    listed = (await client.get(base, headers=h)).json()["data"]
    assert listed[0]["id"] == b["id"]

    renamed = await client.patch(f"{base}/{a['id']}", json={"title": "Renamed alpha"}, headers=h)
    assert renamed.json()["data"]["title"] == "Renamed alpha"

    found = (await client.get(f"{base}?q=beta", headers=h)).json()["data"]
    assert len(found) == 1
    assert found[0]["id"] == b["id"]

    reply = (
        await client.post(f"{base}/{a['id']}/messages", json={"content": "hi"}, headers=h)
    ).json()["data"]
    fb = await client.post(
        f"{base}/{a['id']}/messages/{reply['id']}/feedback", json={"value": 1}, headers=h
    )
    assert fb.status_code == 200
    assert fb.json()["data"]["feedback"] == 1
