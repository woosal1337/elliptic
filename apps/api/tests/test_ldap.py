"""LDAP/AD auth: config + bind login + test-bind (COS-173)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.ldap import service as ldap_service
from tests.helpers import API, create_org, register_and_login


async def test_ldap_config_and_login(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    cfg = await client.put(
        f"{API}/orgs/{org['id']}/ldap",
        json={
            "server_uri": "ldaps://ad.acme.com",
            "bind_dn": "cn=svc,dc=acme,dc=com",
            "bind_password": "secret",
            "search_base": "dc=acme,dc=com",
            "search_filter": "(sAMAccountName={username})",
            "enabled": True,
        },
        headers=h,
    )
    assert cfg.status_code == 200, cfg.text
    assert cfg.json()["data"]["server_uri"] == "ldaps://ad.acme.com"
    assert "bind_password" not in cfg.json()["data"]

    monkeypatch.setattr(
        ldap_service, "_test_bind", lambda conn: {"ok": True, "message": "Connected."}
    )
    test = await client.post(f"{API}/orgs/{org['id']}/ldap/test-bind", headers=h)
    assert test.json()["data"]["ok"] is True

    monkeypatch.setattr(
        ldap_service,
        "_ldap_authenticate",
        lambda conn, username, password: {"email": "jdoe@acme.com", "first": "Jane", "last": "Doe"},
    )
    login = await client.post(
        f"{API}/auth/ldap/login",
        json={"org_id": org["id"], "username": "jdoe", "password": "pw"},
    )
    assert login.status_code == 200, login.text
    assert login.json()["data"]["email"] == "jdoe@acme.com"
    assert "access_token" in login.cookies
    me = await client.get(f"{API}/users/me", cookies=login.cookies)
    assert me.json()["data"]["email"] == "jdoe@acme.com"

    monkeypatch.setattr(ldap_service, "_ldap_authenticate", lambda conn, username, password: None)
    bad = await client.post(
        f"{API}/auth/ldap/login",
        json={"org_id": org["id"], "username": "jdoe", "password": "wrong"},
    )
    assert bad.status_code == 401
