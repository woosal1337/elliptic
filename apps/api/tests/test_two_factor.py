"""Two-factor authentication (TOTP) — COS-214."""

from httpx import AsyncClient

from elliptic.core import totp
from tests.helpers import API, register_and_login


async def test_two_factor_enable_and_login_gate(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    email = auth["email"]

    setup = await client.post(f"{API}/auth/2fa/setup", headers=h)
    assert setup.status_code == 200, setup.text
    secret = setup.json()["data"]["secret"]
    assert "otpauth://" in setup.json()["data"]["otpauth_uri"]

    bad = await client.post(f"{API}/auth/2fa/enable", json={"code": "000000"}, headers=h)
    assert bad.status_code == 400

    enabled = await client.post(
        f"{API}/auth/2fa/enable", json={"code": totp.now_code(secret)}, headers=h
    )
    assert enabled.status_code == 200, enabled.text

    gated = await client.post(f"{API}/auth/login", json={"email": email, "password": "password123"})
    assert gated.status_code == 200, gated.text
    assert gated.json()["data"]["two_factor_required"] is True
    assert gated.json()["data"]["tokens"] is None

    ok_login = await client.post(
        f"{API}/auth/login",
        json={"email": email, "password": "password123", "code": totp.now_code(secret)},
    )
    assert ok_login.status_code == 200, ok_login.text
    assert ok_login.json()["data"]["tokens"]["access_token"]

    h2 = {"Authorization": f"Bearer {ok_login.json()['data']['tokens']['access_token']}"}
    disabled = await client.post(
        f"{API}/auth/2fa/disable", json={"code": totp.now_code(secret)}, headers=h2
    )
    assert disabled.status_code == 200, disabled.text
