"""OIDC SSO: config + authorization + callback JIT provisioning (COS-170)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.sso import service as sso_service
from tests.helpers import API, create_org, register_and_login


async def _d(value: dict) -> dict:
    return value


async def test_sso_config_and_login_flow(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    cfg = await client.put(
        f"{API}/orgs/{org['id']}/sso",
        json={
            "domain": "acme.com",
            "issuer": "https://idp.example.com",
            "client_id": "cid",
            "client_secret": "shh",
            "redirect_uri": "https://app.elliptic.sh/auth/sso/callback",
        },
        headers=h,
    )
    assert cfg.status_code == 200, cfg.text
    assert cfg.json()["data"]["domain"] == "acme.com"
    assert "client_secret" not in cfg.json()["data"]

    discovery = {
        "authorization_endpoint": "https://idp.example.com/authorize",
        "token_endpoint": "https://idp.example.com/token",
        "userinfo_endpoint": "https://idp.example.com/userinfo",
    }
    monkeypatch.setattr(sso_service, "fetch_discovery", lambda issuer: _d(discovery))

    start = await client.get(f"{API}/auth/sso/start", params={"domain": "acme.com"})
    assert start.status_code == 200, start.text
    url = start.json()["data"]["authorization_url"]
    assert url.startswith("https://idp.example.com/authorize?")
    assert "client_id=cid" in url
    state = url.split("state=")[1].split("&")[0]

    monkeypatch.setattr(
        sso_service,
        "exchange_code",
        lambda token_endpoint, **kw: _d({"access_token": "at"}),
    )
    monkeypatch.setattr(
        sso_service,
        "fetch_userinfo",
        lambda userinfo_endpoint, access_token: _d(
            {"email": "new.user@acme.com", "name": "New User"}
        ),
    )

    callback = await client.get(
        f"{API}/auth/sso/callback", params={"code": "authcode", "state": state}
    )
    assert callback.status_code == 200, callback.text
    assert callback.json()["data"]["email"] == "new.user@acme.com"
    assert "access_token" in callback.cookies

    me = await client.get(f"{API}/users/me", cookies=callback.cookies)
    assert me.json()["data"]["email"] == "new.user@acme.com"

    monkeypatch.setattr(
        sso_service,
        "fetch_userinfo",
        lambda userinfo_endpoint, access_token: _d({"email": "evil@other.com"}),
    )
    start2 = await client.get(f"{API}/auth/sso/start", params={"domain": "acme.com"})
    state2 = start2.json()["data"]["authorization_url"].split("state=")[1].split("&")[0]
    bad = await client.get(f"{API}/auth/sso/callback", params={"code": "c", "state": state2})
    assert bad.status_code == 401
