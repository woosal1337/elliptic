"""Auth flow tests: register, login, me, refresh, logout, email verification."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.core.security import create_access_token
from elliptic.modules.auth import service as auth_service
from elliptic.modules.orgs import service as orgs_service
from elliptic.modules.users.models import User
from tests.helpers import API, create_org, register_and_login

FIXED_CODE = "123456"


@pytest.fixture
def verification_on(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    """Force email-verification on and capture delivered emails.

    Returns the list of (recipient, subject) the service attempted to send, so a
    test can assert delivery without a live Resend key.
    """
    monkeypatch.setattr(auth_service, "email_verification_required", lambda: True)
    monkeypatch.setattr(orgs_service, "email_verification_required", lambda: True)
    monkeypatch.setattr(auth_service, "_generate_code", lambda: FIXED_CODE)
    sent: list[tuple[str, str]] = []

    def _capture(to_email: str, subject: str, body: str, *, html: str | None = None) -> None:
        sent.append((to_email, subject))

    monkeypatch.setattr(auth_service, "deliver_email", _capture)
    return sent


async def test_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get(f"{API}/auth/me")
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False


async def test_register_login_me_flow(client: AsyncClient) -> None:
    auth = await register_and_login(client, email="flow@test.dev")
    assert auth["tokens"]["access_token"]
    assert auth["tokens"]["refresh_token"]
    assert "access_token" in client.cookies
    assert "refresh_token" in client.cookies
    me = await client.get(f"{API}/auth/me", headers=auth["headers"])
    assert me.status_code == 200
    body = me.json()
    assert body["success"] is True
    assert body["data"]["email"] == "flow@test.dev"


async def test_register_duplicate_email(client: AsyncClient) -> None:
    await register_and_login(client, email="dupe@test.dev")
    response = await client.post(
        f"{API}/auth/register",
        json={"email": "dupe@test.dev", "password": "password123", "full_name": "Dupe"},
    )
    assert response.status_code == 409


async def test_login_wrong_password(client: AsyncClient) -> None:
    await register_and_login(client, email="wrongpw@test.dev")
    response = await client.post(
        f"{API}/auth/login", json={"email": "wrongpw@test.dev", "password": "not-the-password"}
    )
    assert response.status_code == 401


async def test_me_with_cookie_only(client: AsyncClient) -> None:
    await register_and_login(client, email="cookie@test.dev")
    me = await client.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["data"]["email"] == "cookie@test.dev"


async def test_refresh_rotates_tokens(client: AsyncClient) -> None:
    auth = await register_and_login(client, email="refresh@test.dev")
    response = await client.post(
        f"{API}/auth/refresh", json={"refresh_token": auth["tokens"]["refresh_token"]}
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["access_token"]
    me = await client.get(
        f"{API}/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"}
    )
    assert me.status_code == 200


async def test_refresh_rejects_access_token(client: AsyncClient) -> None:
    auth = await register_and_login(client, email="badrefresh@test.dev")
    client.cookies.clear()
    response = await client.post(
        f"{API}/auth/refresh", json={"refresh_token": auth["tokens"]["access_token"]}
    )
    assert response.status_code == 401


async def test_logout_clears_cookies(client: AsyncClient) -> None:
    await register_and_login(client, email="logout@test.dev")
    response = await client.post(f"{API}/auth/logout")
    assert response.status_code == 200
    me = await client.get(f"{API}/auth/me")
    assert me.status_code == 401


async def test_register_auto_verifies_without_resend_key(client: AsyncClient) -> None:
    response = await client.post(
        f"{API}/auth/register",
        json={"email": "auto@test.dev", "password": "password123", "full_name": "Auto"},
    )
    assert response.status_code == 201
    assert response.json()["data"]["email_verified"] is True
    login = await client.post(
        f"{API}/auth/login", json={"email": "auto@test.dev", "password": "password123"}
    )
    assert login.status_code == 200


async def test_register_requires_verification_when_enabled(
    client: AsyncClient, verification_on: list[tuple[str, str]]
) -> None:
    response = await client.post(
        f"{API}/auth/register",
        json={"email": "verify@test.dev", "password": "password123", "full_name": "V"},
    )
    assert response.status_code == 201
    assert response.json()["data"]["email_verified"] is False
    assert verification_on == [("verify@test.dev", "Your Elliptic verification code")]

    async with session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "verify@test.dev"))
        assert user is not None
        assert user.verification_code_hash is not None

    login = await client.post(
        f"{API}/auth/login", json={"email": "verify@test.dev", "password": "password123"}
    )
    assert login.status_code == 403


async def test_verify_email_wrong_code(
    client: AsyncClient, verification_on: list[tuple[str, str]]
) -> None:
    await client.post(
        f"{API}/auth/register",
        json={"email": "wrong@test.dev", "password": "password123", "full_name": "W"},
    )
    response = await client.post(
        f"{API}/auth/verify-email", json={"email": "wrong@test.dev", "code": "000000"}
    )
    assert response.status_code == 400


async def test_verify_email_expired_code(
    client: AsyncClient, verification_on: list[tuple[str, str]]
) -> None:
    await client.post(
        f"{API}/auth/register",
        json={"email": "expired@test.dev", "password": "password123", "full_name": "E"},
    )
    async with session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "expired@test.dev"))
        assert user is not None
        user.verification_expires_at = datetime.now(UTC) - timedelta(minutes=1)
        await session.commit()
    response = await client.post(
        f"{API}/auth/verify-email", json={"email": "expired@test.dev", "code": FIXED_CODE}
    )
    assert response.status_code == 400


async def test_verify_email_correct_code_logs_in(
    client: AsyncClient, verification_on: list[tuple[str, str]]
) -> None:
    await client.post(
        f"{API}/auth/register",
        json={"email": "ok@test.dev", "password": "password123", "full_name": "OK"},
    )
    response = await client.post(
        f"{API}/auth/verify-email", json={"email": "ok@test.dev", "code": FIXED_CODE}
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["tokens"]["access_token"]
    assert data["user"]["email_verified"] is True

    login = await client.post(
        f"{API}/auth/login", json={"email": "ok@test.dev", "password": "password123"}
    )
    assert login.status_code == 200


async def test_resend_verification_always_succeeds(
    client: AsyncClient, verification_on: list[tuple[str, str]]
) -> None:
    await client.post(
        f"{API}/auth/register",
        json={"email": "resend@test.dev", "password": "password123", "full_name": "R"},
    )
    verification_on.clear()
    response = await client.post(
        f"{API}/auth/resend-verification", json={"email": "resend@test.dev"}
    )
    assert response.status_code == 200
    assert verification_on == [("resend@test.dev", "Your Elliptic verification code")]

    verification_on.clear()
    missing = await client.post(
        f"{API}/auth/resend-verification", json={"email": "nobody@test.dev"}
    )
    assert missing.status_code == 200
    assert verification_on == []


async def test_unverified_user_cannot_accept_invite(
    client: AsyncClient, verification_on: list[tuple[str, str]]
) -> None:
    await client.post(
        f"{API}/auth/register",
        json={"email": "owner@test.dev", "password": "password123", "full_name": "Owner"},
    )
    owner_verify = await client.post(
        f"{API}/auth/verify-email", json={"email": "owner@test.dev", "code": FIXED_CODE}
    )
    assert owner_verify.status_code == 200
    owner_headers = {
        "Authorization": f"Bearer {owner_verify.json()['data']['tokens']['access_token']}"
    }
    owner = {"headers": owner_headers}
    org = await create_org(client, owner["headers"])

    await client.post(
        f"{API}/auth/register",
        json={"email": "invited@test.dev", "password": "password123", "full_name": "I"},
    )
    invite = await client.post(
        f"{API}/orgs/{org['id']}/invites",
        json={"email": "invited@test.dev", "role": "member"},
        headers=owner["headers"],
    )
    assert invite.status_code == 201
    token = invite.json()["data"]["token"]

    headers_unverified = await _login_unverified(client, "invited@test.dev")
    blocked = await client.post(
        f"{API}/invites/accept", json={"token": token}, headers=headers_unverified
    )
    assert blocked.status_code == 403

    verified = await client.post(
        f"{API}/auth/verify-email", json={"email": "invited@test.dev", "code": FIXED_CODE}
    )
    assert verified.status_code == 200
    headers_verified = {
        "Authorization": f"Bearer {verified.json()['data']['tokens']['access_token']}"
    }
    accepted = await client.post(
        f"{API}/invites/accept", json={"token": token}, headers=headers_verified
    )
    assert accepted.status_code == 200


async def _login_unverified(client: AsyncClient, email: str) -> dict[str, str]:
    """Mint an access token for an unverified user, bypassing the login 403.

    Login refuses unverified accounts (by design), so to test the accept-invite gate
    we issue an access token directly from the stored user id.
    """
    async with session_factory() as session:
        user = await session.scalar(select(User).where(User.email == email))
        assert user is not None
        token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}
