"""Auth-provider endpoints (COS-209)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import RedirectResponse

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.exceptions import UnauthorizedError
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.core.security import create_access_token, create_refresh_token
from elliptic.modules.auth.schemas import LoginOut, TokenPair, UserOut
from elliptic.modules.auth_providers import service
from elliptic.modules.auth_providers.schemas import (
    AuthProviderConfigIn,
    AuthProviderConfigOut,
    NativeExchangeIn,
    PublicProvidersOut,
)
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.users.models import User

admin_router = APIRouter(prefix="/orgs/{org_id}/auth-providers", tags=["auth-providers"])
public_router = APIRouter(prefix="/auth", tags=["auth-providers"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    settings = get_settings()
    secure = settings.env == "production"
    response.set_cookie(
        "access_token",
        access,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=secure,
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,
        samesite="lax",
        secure=secure,
    )


@admin_router.get("")
async def get_config(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[AuthProviderConfigOut]:
    config = await service.get_config(session, ctx)
    return ok(AuthProviderConfigOut.model_validate(config))


@admin_router.put("")
async def update_config(
    payload: AuthProviderConfigIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AuthProviderConfigOut]:
    config = await service.update_config(session, ctx, **payload.model_dump(exclude_unset=True))
    return ok(AuthProviderConfigOut.model_validate(config), message="Sign-in providers updated")


@public_router.get("/providers")
async def public_providers() -> SuccessResponse[PublicProvidersOut]:
    """Which sign-in methods the login screen should offer (COS-209)."""
    configured = service.configured_providers()
    return ok(PublicProvidersOut(google=configured["google"], github=configured["github"]))


@public_router.get("/oauth/{provider}/start")
async def oauth_start(provider: str) -> SuccessResponse[dict[str, str]]:
    """Begin a Google/GitHub sign-in: returns the authorization URL (COS-209)."""
    return ok({"authorization_url": service.authorization_url(provider)})


@public_router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    response: Response,
    session: SessionDep,
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
) -> SuccessResponse[UserOut]:
    """Complete a social sign-in, JIT-provisioning the user + a session (COS-209)."""
    user = await service.complete_login(session, provider, code, state)
    _set_auth_cookies(response, create_access_token(user.id), create_refresh_token(user.id))
    return ok(UserOut.model_validate(user), message="Signed in")


@public_router.get("/oauth/{provider}/native/start")
async def oauth_native_start(
    provider: str,
    challenge: Annotated[str, Query(min_length=32, max_length=128)],
) -> SuccessResponse[dict[str, str]]:
    """Begin a sign-in from the mobile app (COS-209).

    `challenge` is the SHA-256 of a verifier the app keeps; the callback binds
    its handoff code to it so only that app can complete the sign-in.
    """
    return ok({"authorization_url": service.authorization_url(provider, challenge)})


@public_router.get("/oauth/{provider}/native/callback")
async def oauth_native_callback(
    provider: str,
    session: SessionDep,
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
) -> RedirectResponse:
    """Finish a native sign-in and hand a short-lived code back to the app.

    Errors redirect too — the in-app browser only closes on the app's scheme, so
    failing here with JSON would strand the user on a blank page.
    """
    failed = RedirectResponse(service.native_app_url("error=sign_in_failed"), status_code=302)
    try:
        challenge = str(service.verify_state(state, provider).get("c") or "")
        if not challenge:
            return failed
        user = await service.complete_login(session, provider, code, state, native=True)
    except Exception:
        return failed
    handoff = service.issue_native_code(user.id, challenge)
    return RedirectResponse(service.native_app_url(f"code={handoff}"), status_code=302)


@public_router.post("/oauth/native/exchange")
async def oauth_native_exchange(
    payload: NativeExchangeIn, session: SessionDep
) -> SuccessResponse[LoginOut]:
    """Trade a handoff code plus its verifier for real tokens (COS-209)."""
    user_id = service.verify_native_code(payload.code, payload.verifier)
    user = await session.get(User, user_id)
    if user is None:
        raise UnauthorizedError("Invalid sign-in code")
    tokens = TokenPair(
        access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id)
    )
    return ok(LoginOut(user=UserOut.model_validate(user), tokens=tokens), message="Signed in")
