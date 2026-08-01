"""Rich external embeds + unfurl (COS-149)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.embeds import service as embed_service
from tests.helpers import API, create_org, register_and_login


async def _note(client: AsyncClient, h: dict, org_id: str) -> str:
    res = await client.post(
        f"{API}/orgs/{org_id}/notes", json={"title": "Design doc", "content": "x"}, headers=h
    )
    return res.json()["data"]["id"]


async def test_provider_iframe_unfurl_no_fetch(client: AsyncClient) -> None:
    """A known provider (YouTube) resolves to an iframe with no outbound fetch."""
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    res = await client.post(
        f"{API}/orgs/{org['id']}/embeds/unfurl",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=h,
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["provider"] == "youtube"
    assert data["kind"] == "iframe"
    assert "youtube.com/embed/dQw4w9WgXcQ" in data["iframe_url"]


async def test_generic_link_unfurl_mocked(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    async def fake_unfurl(session, url):
        from elliptic.modules.embeds.schemas import EmbedMeta  # noqa: PLC0415

        return EmbedMeta(url=url, provider="link", kind="link", title="Example", description="d")

    monkeypatch.setattr(embed_service, "unfurl", fake_unfurl)

    note_id = await _note(client, h, org["id"])
    created = await client.post(
        f"{API}/orgs/{org['id']}/notes/{note_id}/embeds",
        json={"url": "https://example.com/page"},
        headers=h,
    )
    assert created.status_code == 201, created.text
    assert created.json()["data"]["title"] == "Example"
    embed_id = created.json()["data"]["id"]

    listed = await client.get(f"{API}/orgs/{org['id']}/notes/{note_id}/embeds", headers=h)
    assert len(listed.json()["data"]) == 1

    deleted = await client.delete(
        f"{API}/orgs/{org['id']}/notes/{note_id}/embeds/{embed_id}", headers=h
    )
    assert deleted.status_code == 200
    assert (await client.get(f"{API}/orgs/{org['id']}/notes/{note_id}/embeds", headers=h)).json()[
        "data"
    ] == []


async def test_rejects_non_http(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    bad = await client.post(
        f"{API}/orgs/{org['id']}/embeds/unfurl", json={"url": "ftp://x"}, headers=h
    )
    assert bad.status_code == 400
