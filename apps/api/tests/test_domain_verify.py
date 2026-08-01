"""Email-domain verification via DNS TXT (COS-193)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.domains import service as domain_service
from tests.helpers import API, create_org, register_and_login


async def test_domain_add_verify_flow(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    base = f"{API}/orgs/{org['id']}/domains"

    created = await client.post(base, json={"domain": "Example.com"}, headers=h)
    assert created.status_code == 201, created.text
    data = created.json()["data"]
    assert data["domain"] == "example.com"
    assert data["status"] == "pending"
    token_record = data["txt_record"]
    domain_id = data["id"]

    monkeypatch.setattr(domain_service, "resolve_txt_records", lambda domain: _async([]))
    bad = await client.post(f"{base}/{domain_id}/verify", headers=h)
    assert bad.status_code == 400

    monkeypatch.setattr(
        domain_service, "resolve_txt_records", lambda domain: _async(["unrelated", token_record])
    )
    ok = await client.post(f"{base}/{domain_id}/verify", headers=h)
    assert ok.status_code == 200, ok.text
    assert ok.json()["data"]["status"] == "verified"
    assert ok.json()["data"]["verified_at"]


async def _async(value: list[str]) -> list[str]:
    return value


async def test_verified_domain_is_globally_unique(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org1 = await create_org(client, h)
    base1 = f"{API}/orgs/{org1['id']}/domains"
    rec = (await client.post(base1, json={"domain": "acme.io"}, headers=h)).json()["data"]
    monkeypatch.setattr(
        domain_service, "resolve_txt_records", lambda domain: _async([rec["txt_record"]])
    )
    await client.post(f"{base1}/{rec['id']}/verify", headers=h)

    org2 = await create_org(client, h)
    dup = await client.post(
        f"{API}/orgs/{org2['id']}/domains", json={"domain": "acme.io"}, headers=h
    )
    assert dup.status_code == 409
