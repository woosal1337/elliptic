"""Auth-provider config + Google/GitHub OAuth login (COS-209)."""

import base64
import hashlib
import secrets
import uuid
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from companyos.core.config import get_settings
from companyos.core.deps import OrgContext
from companyos.core.exceptions import BadRequestError, UnauthorizedError
from companyos.core.security import hash_password
from companyos.modules.auth_providers.models import AuthProviderConfig
from companyos.modules.users.models import User

_STATE_TTL = 600
# The handoff code only has to survive the redirect back into the app.
_NATIVE_CODE_TTL = 600
_HTTP_ERROR_STATUS = 400

_ENDPOINTS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
    },
    "github": {
        "authorize": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "userinfo": "https://api.github.com/user",
        "scope": "read:user user:email",
    },
}


def _creds(provider: str) -> tuple[str, str, str]:
    s = get_settings()
    if provider == "google":
        return s.google_client_id, s.google_client_secret, s.google_redirect_uri
    if provider == "github":
        return s.github_client_id, s.github_client_secret, s.github_redirect_uri
    raise BadRequestError("Unknown provider")


def configured_providers() -> dict[str, bool]:
    """Which OAuth providers have instance credentials configured (COS-209)."""
    s = get_settings()
    return {
        "google": bool(s.google_client_id and s.google_client_secret),
        "github": bool(s.github_client_id and s.github_client_secret),
    }


async def get_config(session: AsyncSession, ctx: OrgContext) -> AuthProviderConfig:
    config = await session.scalar(
        select(AuthProviderConfig).where(AuthProviderConfig.org_id == ctx.org.id)
    )
    if config is None:
        config = AuthProviderConfig(org_id=ctx.org.id)
        session.add(config)
        await session.flush()
    return config


async def update_config(
    session: AsyncSession, ctx: OrgContext, **fields: bool | None
) -> AuthProviderConfig:
    config = await get_config(session, ctx)
    for key, value in fields.items():
        if value is not None and hasattr(config, key):
            setattr(config, key, value)
    await session.flush()
    return config


async def exchange_code(provider: str, code: str, redirect_uri: str | None = None) -> str:
    client_id, client_secret, default_redirect = _creds(provider)
    # Providers require the token call to repeat the authorize call's redirect.
    redirect_uri = redirect_uri or default_redirect
    ep = _ENDPOINTS[provider]
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.post(
            ep["token"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return str(resp.json()["access_token"])


async def fetch_identity(provider: str, access_token: str) -> tuple[str, str]:
    """Return (email, name) from the provider's userinfo (COS-209)."""
    ep = _ENDPOINTS[provider]
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.get(ep["userinfo"], headers=headers)
        resp.raise_for_status()
        info: dict[str, Any] = dict(resp.json())
        email = str(info.get("email") or "")
        name = str(info.get("name") or info.get("login") or "")
        if not email and provider == "github":
            emails = await http.get("https://api.github.com/user/emails", headers=headers)
            if emails.status_code < _HTTP_ERROR_STATUS:
                primary = next(
                    (e for e in emails.json() if e.get("primary") and e.get("verified")), None
                )
                if primary:
                    email = str(primary["email"])
    return email.strip().lower(), name


def _sign_state(provider: str, challenge: str | None = None) -> str:
    import time  # noqa: PLC0415

    payload: dict[str, Any] = {"p": provider, "exp": int(time.time()) + _STATE_TTL}
    if challenge:
        payload["c"] = challenge
    return jwt.encode(payload, get_settings().jwt_secret_key, algorithm="HS256")


def _verify_state(state: str, provider: str) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = jwt.decode(
            state, get_settings().jwt_secret_key, algorithms=["HS256"]
        )
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired OAuth state") from exc
    if payload.get("p") != provider:
        raise UnauthorizedError("OAuth state/provider mismatch")
    return payload


def verify_state(state: str, provider: str) -> dict[str, Any]:
    """Public wrapper: validate an OAuth state and return its payload."""
    return _verify_state(state, provider)


def native_redirect_uri(provider: str) -> str:
    """Where the provider sends a native sign-in back — this API, not the web app."""
    return f"{get_settings().oauth_issuer.rstrip('/')}/api/v1/auth/oauth/{provider}/native/callback"


def native_app_url(query: str) -> str:
    """The app's deep link that ends the in-app browser session."""
    return f"{get_settings().native_app_scheme}://auth/callback?{query}"


def _challenge_for(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def issue_native_code(user_id: uuid.UUID, challenge: str) -> str:
    """A short-lived, single-purpose code the app trades for real tokens.

    Tokens themselves never travel in the custom-scheme redirect: another app
    could claim `companyos://`, and this code is worthless without the verifier
    that only the app that started the flow holds.
    """
    import time  # noqa: PLC0415

    payload = {
        "sub": str(user_id),
        "c": challenge,
        "typ": "native_oauth",
        "exp": int(time.time()) + _NATIVE_CODE_TTL,
    }
    return jwt.encode(payload, get_settings().jwt_secret_key, algorithm="HS256")


def verify_native_code(code: str, verifier: str) -> uuid.UUID:
    """Validate a handoff code against its verifier and return the user id."""
    try:
        payload = jwt.decode(code, get_settings().jwt_secret_key, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        # Log the shape, never the value: this is the one failure a client can
        # hit with no server-side trace of why.
        logger.warning(
            "native oauth exchange rejected: {} (segments={}, length={})",
            exc.__class__.__name__,
            code.count(".") + 1,
            len(code),
        )
        raise UnauthorizedError("Invalid or expired sign-in code") from exc
    if payload.get("typ") != "native_oauth":
        logger.warning("native oauth exchange rejected: wrong token type {}", payload.get("typ"))
        raise UnauthorizedError("Invalid sign-in code")
    if not secrets.compare_digest(_challenge_for(verifier), str(payload.get("c", ""))):
        logger.warning("native oauth exchange rejected: challenge/verifier mismatch")
        raise UnauthorizedError("Sign-in code does not match this device")
    return uuid.UUID(str(payload["sub"]))


def authorization_url(provider: str, challenge: str | None = None) -> str:
    """Authorization URL for the web flow, or for a native app when `challenge` is set."""
    if provider not in _ENDPOINTS:
        raise BadRequestError("Unknown provider")
    client_id, _secret, redirect_uri = _creds(provider)
    if not client_id:
        raise BadRequestError(f"{provider} sign-in is not configured")
    if challenge:
        redirect_uri = native_redirect_uri(provider)
    ep = _ENDPOINTS[provider]
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": ep["scope"],
        "state": _sign_state(provider, challenge),
    }
    return f"{ep['authorize']}?{urlencode(params)}"


async def complete_login(
    session: AsyncSession, provider: str, code: str, state: str, native: bool = False
) -> User:
    _verify_state(state, provider)
    # The web path keeps its two-argument call so the redirect stays implicit.
    token = (
        await exchange_code(provider, code, native_redirect_uri(provider))
        if native
        else await exchange_code(provider, code)
    )
    email, name = await fetch_identity(provider, token)
    if not email:
        raise UnauthorizedError("The provider did not return a verified email")
    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            full_name=name or email.split("@")[0],
            email_verified=True,
        )
        session.add(user)
        await session.flush()
    return user
