"""LDAP endpoints (COS-173)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.core.security import create_access_token, create_refresh_token
from elliptic.modules.auth.schemas import UserOut
from elliptic.modules.ldap import service
from elliptic.modules.ldap.schemas import (
    LDAPConnectionIn,
    LDAPConnectionOut,
    LDAPLoginIn,
    LDAPTestResult,
)
from elliptic.modules.orgs.models import OrgRole

admin_router = APIRouter(prefix="/orgs/{org_id}/ldap", tags=["ldap"])
public_router = APIRouter(prefix="/auth/ldap", tags=["ldap"])

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
async def get_connection(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[LDAPConnectionOut | None]:
    conn = await service.get_connection(session, ctx.org.id)
    return ok(LDAPConnectionOut.model_validate(conn) if conn else None)


@admin_router.put("")
async def upsert_connection(
    payload: LDAPConnectionIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[LDAPConnectionOut]:
    conn = await service.upsert_connection(
        session,
        ctx,
        server_uri=payload.server_uri,
        use_tls=payload.use_tls,
        bind_dn=payload.bind_dn,
        bind_password=payload.bind_password,
        search_base=payload.search_base,
        search_filter=payload.search_filter,
        attr_email=payload.attr_email,
        attr_first=payload.attr_first,
        attr_last=payload.attr_last,
        enabled=payload.enabled,
    )
    return ok(LDAPConnectionOut.model_validate(conn), message="LDAP configured")


@admin_router.delete("")
async def delete_connection(ctx: AdminCtx, session: SessionDep) -> SuccessResponse[None]:
    await service.delete_connection(session, ctx)
    return ok(None, message="LDAP removed")


@admin_router.post("/test-bind")
async def test_bind(ctx: AdminCtx, session: SessionDep) -> SuccessResponse[LDAPTestResult]:
    """Run a service bind + sample search and return plain-language diagnostics (COS-173)."""
    result = await service.test_bind(session, ctx)
    return ok(LDAPTestResult.model_validate(result))


@public_router.post("/login")
async def ldap_login(
    payload: LDAPLoginIn, response: Response, session: SessionDep
) -> SuccessResponse[UserOut]:
    """Authenticate against the org's directory, JIT-provision, and issue a session (COS-173)."""
    user = await service.authenticate(session, payload.org_id, payload.username, payload.password)
    _set_auth_cookies(response, create_access_token(user.id), create_refresh_token(user.id))
    return ok(UserOut.model_validate(user), message="Signed in")
