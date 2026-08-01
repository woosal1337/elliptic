"""Page-anchored AI doc assistant (COS-254)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import ChatMessage, CompletionResult
from tests.helpers import API, create_org, register_and_login

KEY = "sk-test-docassist-key-1234"


class FakeProvider:
    def __init__(self) -> None:
        self.last: list[ChatMessage] = []

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        self.last = messages
        return CompletionResult(
            content="## Summary\nThe page is about onboarding.",
            model=model,
            input_tokens=5,
            output_tokens=8,
        )


async def test_doc_assist_grounds_on_page(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    note = await client.post(
        f"{API}/orgs/{org['id']}/notes",
        json={"title": "Onboarding", "content": "Step 1. Step 2."},
        headers=h,
    )
    assert note.status_code in (200, 201), note.text
    note_id = note.json()["data"]["id"]

    fake = FakeProvider()
    monkeypatch.setattr(
        ai_service, "get_provider", lambda provider, api_key, transport=None, base_url=None: fake
    )
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )

    res = await client.post(
        f"{API}/orgs/{org['id']}/ai/doc-assist",
        json={
            "note_id": note_id,
            "content": "Live edited content here",
            "question": "Summarize this page",
        },
        headers=h,
    )
    assert res.status_code == 200, res.text
    assert "onboarding" in res.json()["data"]["answer"].lower()
    assert res.json()["data"]["ai_run_id"]
    assert "Live edited content here" in " ".join(m["content"] for m in fake.last)

    bad = await client.post(
        f"{API}/orgs/{org['id']}/ai/doc-assist",
        json={"note_id": "00000000-0000-0000-0000-000000000000", "question": "x"},
        headers=h,
    )
    assert bad.status_code == 404
