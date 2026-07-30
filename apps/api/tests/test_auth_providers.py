"""Auth provider matrix + Google/GitHub OAuth login (COS-209)."""

import pytest
from httpx import AsyncClient

from companyos.modules.auth_providers import service as ap_service
from tests.helpers import API, create_org, register_and_login


async def test_provider_config_and_oauth(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    cfg = await client.get(f"{API}/orgs/{org['id']}/auth-providers", headers=h)
    assert cfg.status_code == 200, cfg.text
    assert cfg.json()["data"]["password_enabled"] is True
    assert cfg.json()["data"]["google_enabled"] is False

    upd = await client.put(
        f"{API}/orgs/{org['id']}/auth-providers",
        json={"google_enabled": True, "allow_self_signup": False},
        headers=h,
    )
    assert upd.json()["data"]["google_enabled"] is True
    assert upd.json()["data"]["allow_self_signup"] is False

    monkeypatch.setattr(
        ap_service, "configured_providers", lambda: {"google": True, "github": False}
    )
    pub = await client.get(f"{API}/auth/providers")
    assert pub.status_code == 200, pub.text
    assert pub.json()["data"]["google"] is True
    assert pub.json()["data"]["github"] is False
    assert pub.json()["data"]["password"] is True

    monkeypatch.setattr(ap_service, "_creds", lambda p: ("cid", "secret", "https://app/cb"))
    start = await client.get(f"{API}/auth/oauth/google/start")
    assert start.status_code == 200, start.text
    url = start.json()["data"]["authorization_url"]
    assert url.startswith("https://accounts.google.com/")
    state = url.split("state=")[1].split("&")[0]

    async def fake_exchange(provider: str, code: str) -> str:
        return "access-token"

    async def fake_identity(provider: str, token: str) -> tuple[str, str]:
        return "social.user@acme.com", "Social User"

    monkeypatch.setattr(ap_service, "exchange_code", fake_exchange)
    monkeypatch.setattr(ap_service, "fetch_identity", fake_identity)
    cb = await client.get(f"{API}/auth/oauth/google/callback", params={"code": "x", "state": state})
    assert cb.status_code == 200, cb.text
    assert cb.json()["data"]["email"] == "social.user@acme.com"
    assert "access_token" in cb.cookies
    me = await client.get(f"{API}/users/me", cookies=cb.cookies)
    assert me.json()["data"]["email"] == "social.user@acme.com"


async def test_native_oauth_round_trip(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The mobile flow hands back a code, not tokens, and it needs the verifier."""
    verifier = "a" * 43
    challenge = ap_service._challenge_for(verifier)

    monkeypatch.setattr(ap_service, "_creds", lambda p: ("cid", "secret", "https://app/cb"))
    start = await client.get(
        f"{API}/auth/oauth/google/native/start", params={"challenge": challenge}
    )
    assert start.status_code == 200, start.text
    url = start.json()["data"]["authorization_url"]
    # The provider must send the user back to this API, not to the web app.
    assert "auth%2Foauth%2Fgoogle%2Fnative%2Fcallback" in url
    state = url.split("state=")[1].split("&")[0]

    async def fake_exchange(provider: str, code: str, redirect_uri: str | None = None) -> str:
        assert redirect_uri == ap_service.native_redirect_uri(provider)
        return "access-token"

    async def fake_identity(provider: str, token: str) -> tuple[str, str]:
        return "native.user@acme.com", "Native User"

    monkeypatch.setattr(ap_service, "exchange_code", fake_exchange)
    monkeypatch.setattr(ap_service, "fetch_identity", fake_identity)

    cb = await client.get(
        f"{API}/auth/oauth/google/native/callback",
        params={"code": "x", "state": state},
        follow_redirects=False,
    )
    assert cb.status_code == 302, cb.text
    location = cb.headers["location"]
    assert location.startswith("companyos://auth/callback?code=")
    # No tokens ride in the redirect: another app could claim the scheme.
    assert "access_token" not in location
    handoff = location.split("code=")[1]

    wrong = await client.post(
        f"{API}/auth/oauth/native/exchange",
        json={"code": handoff, "verifier": "b" * 43},
    )
    assert wrong.status_code == 401, wrong.text

    good = await client.post(
        f"{API}/auth/oauth/native/exchange",
        json={"code": handoff, "verifier": verifier},
    )
    assert good.status_code == 200, good.text
    data = good.json()["data"]
    assert data["user"]["email"] == "native.user@acme.com"
    me = await client.get(
        f"{API}/users/me",
        headers={"Authorization": f"Bearer {data['tokens']['access_token']}"},
    )
    assert me.json()["data"]["email"] == "native.user@acme.com"


async def test_native_callback_redirects_on_failure(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A failed sign-in still has to come back through the app's scheme."""
    monkeypatch.setattr(ap_service, "_creds", lambda p: ("cid", "secret", "https://app/cb"))
    cb = await client.get(
        f"{API}/auth/oauth/google/native/callback",
        params={"code": "x", "state": "not-a-valid-state"},
        follow_redirects=False,
    )
    assert cb.status_code == 302
    assert cb.headers["location"] == "companyos://auth/callback?error=sign_in_failed"
