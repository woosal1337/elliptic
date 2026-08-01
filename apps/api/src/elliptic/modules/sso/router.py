"""SSO endpoints (COS-170)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.core.security import create_access_token, create_refresh_token
from elliptic.modules.auth.schemas import UserOut
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.sso import service
from elliptic.modules.sso.schemas import SSOConnectionIn, SSOConnectionOut, SSOStartOut

admin_router = APIRouter(prefix="/orgs/{org_id}/sso", tags=["sso"])
public_router = APIRouter(prefix="/auth/sso", tags=["sso"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


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


@admin_router.get("")
async def get_connection(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SSOConnectionOut | None]:
    connection = await service.get_connection(session, ctx)
    return ok(SSOConnectionOut.model_validate(connection) if connection else None)


@admin_router.put("")
async def upsert_connection(
    payload: SSOConnectionIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[SSOConnectionOut]:
    connection = await service.upsert_connection(
        session,
        ctx,
        domain=payload.domain.lower(),
        issuer=payload.issuer,
        client_id=payload.client_id,
        client_secret=payload.client_secret,
        redirect_uri=payload.redirect_uri,
        enabled=payload.enabled,
    )
    return ok(SSOConnectionOut.model_validate(connection), message="SSO configured")


@admin_router.delete("")
async def delete_connection(ctx: AdminCtx, session: SessionDep) -> SuccessResponse[None]:
    await service.delete_connection(session, ctx)
    return ok(None, message="SSO removed")


@public_router.get("/start")
async def sso_start(
    session: SessionDep, domain: Annotated[str, Query(min_length=3, max_length=255)]
) -> SuccessResponse[SSOStartOut]:
    """Begin SSO: returns the IdP authorization URL for the domain (COS-170)."""
    url = await service.authorization_url(session, domain.lower())
    return ok(SSOStartOut(authorization_url=url))


@public_router.get("/callback")
async def sso_callback(
    response: Response,
    session: SessionDep,
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
) -> SuccessResponse[UserOut]:
    """Complete SSO: exchange the code, JIT-provision, and issue a session (COS-170)."""
    user = await service.complete_login(session, code, state)
    _set_auth_cookies(response, create_access_token(user.id), create_refresh_token(user.id))
    return ok(UserOut.model_validate(user), message="Signed in")
