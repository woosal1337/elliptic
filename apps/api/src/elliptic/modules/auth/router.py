"""Authentication endpoints: register, login, refresh, logout, me."""

from fastapi import APIRouter, Request, Response, status

from elliptic.core import totp
from elliptic.core.config import get_settings
from elliptic.core.deps import CurrentUser, SessionDep
from elliptic.core.exceptions import UnauthorizedError
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.core.security import create_access_token, create_refresh_token, decode_token
from elliptic.modules.auth import service
from elliptic.modules.auth.schemas import (
    LoginIn,
    LoginOut,
    RefreshIn,
    RegisterIn,
    ResendVerificationIn,
    TokenPair,
    TwoFactorSetupOut,
    TwoFactorVerifyIn,
    UserOut,
    VerifyEmailIn,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    settings = get_settings()
    secure = settings.env == "production"
    response.set_cookie(
        "access_token",
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=secure,
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,
        samesite="lax",
        secure=secure,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterIn, session: SessionDep) -> SuccessResponse[UserOut]:
    user = await service.register_user(session, payload)
    return ok(UserOut.model_validate(user), message="Account created")


@router.post("/login")
async def login(
    payload: LoginIn, session: SessionDep, response: Response
) -> SuccessResponse[LoginOut]:
    user = await service.authenticate(session, payload)
    if user.totp_enabled:
        if payload.code is None:
            return ok(LoginOut(two_factor_required=True), message="Two-factor code required")
        if not service.verify_totp(user, payload.code):
            raise UnauthorizedError("Invalid two-factor code")
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    tokens = TokenPair(access_token=access_token, refresh_token=refresh_token)
    return ok(LoginOut(user=UserOut.model_validate(user), tokens=tokens), message="Logged in")


@router.post("/verify-email")
async def verify_email(
    payload: VerifyEmailIn, session: SessionDep, response: Response
) -> SuccessResponse[LoginOut]:
    user = await service.verify_email(session, payload.email, payload.code)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    tokens = TokenPair(access_token=access_token, refresh_token=refresh_token)
    return ok(LoginOut(user=UserOut.model_validate(user), tokens=tokens), message="Email verified")


@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerificationIn, session: SessionDep
) -> SuccessResponse[None]:
    await service.resend_verification(session, payload.email)
    return ok(None, message="If that account exists, a code was sent")


@router.post("/refresh")
async def refresh(
    request: Request, response: Response, payload: RefreshIn | None = None
) -> SuccessResponse[TokenPair]:
    token = (payload.refresh_token if payload else None) or request.cookies.get("refresh_token")
    if not token:
        raise UnauthorizedError("Missing refresh token")
    user_id = decode_token(token, "refresh")
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    _set_auth_cookies(response, access_token, refresh_token)
    return ok(
        TokenPair(access_token=access_token, refresh_token=refresh_token),
        message="Tokens refreshed",
    )


@router.post("/logout")
async def logout(response: Response) -> SuccessResponse[None]:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return ok(None, message="Logged out")


@router.get("/me")
async def me(user: CurrentUser) -> SuccessResponse[UserOut]:
    return ok(UserOut.model_validate(user))


@router.post("/2fa/setup")
async def setup_two_factor(
    user: CurrentUser, session: SessionDep
) -> SuccessResponse[TwoFactorSetupOut]:
    secret = await service.start_totp_setup(session, user)
    return ok(
        TwoFactorSetupOut(secret=secret, otpauth_uri=totp.provisioning_uri(secret, user.email))
    )


@router.post("/2fa/enable")
async def enable_two_factor(
    payload: TwoFactorVerifyIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[None]:
    await service.enable_totp(session, user, payload.code)
    return ok(None, message="Two-factor authentication enabled")


@router.post("/2fa/disable")
async def disable_two_factor(
    payload: TwoFactorVerifyIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[None]:
    await service.disable_totp(session, user, payload.code)
    return ok(None, message="Two-factor authentication disabled")
