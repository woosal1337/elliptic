"""Outbound MCP connectors (COS-228)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.mcp_connectors import service as conn_service
from tests.helpers import API, create_org, register_and_login


async def test_connector_catalog_and_crud(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/mcp-connectors"

    catalog = await client.get(f"{base}/catalog", headers=h)
    assert catalog.status_code == 200, catalog.text
    assert any(c["key"] == "github" for c in catalog.json()["data"])

    created = await client.post(
        base,
        json={"catalog_key": "github", "credential": "ghp_secret_token"},
        headers=h,
    )
    assert created.status_code == 201, created.text
    cid = created.json()["data"]["id"]
    assert created.json()["data"]["display_name"] == "GitHub"
    assert "credential" not in created.json()["data"]

    async def fake_discover(connector, org_id):
        return [{"name": "list_issues", "description": "List issues"}]

    monkeypatch.setattr(conn_service, "discover_tools", fake_discover)
    test = await client.post(f"{base}/{cid}/test", headers=h)
    assert test.status_code == 200, test.text
    assert test.json()["data"]["ok"] is True
    assert test.json()["data"]["tools"][0]["name"] == "list_issues"

    await client.patch(f"{base}/{cid}", json={"enabled": False}, headers=h)
    listed = await client.get(base, headers=h)
    assert listed.json()["data"][0]["enabled"] is False
    assert (await client.delete(f"{base}/{cid}", headers=h)).status_code == 200

    bad = await client.post(base, json={"catalog_key": "nope"}, headers=h)
    assert bad.status_code == 400
