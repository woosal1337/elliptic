"""Request dependencies: current user, org context, and role gates."""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.database import get_session
from elliptic.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from elliptic.core.security import decode_token
from elliptic.modules.orgs.models import ROLE_ORDER, Organization, OrganizationMember, OrgRole
from elliptic.modules.users.models import User

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _extract_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()
    api_key = request.headers.get("x-api-key", "").strip()
    if api_key:
        return api_key
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    raise UnauthorizedError("Missing credentials")


async def get_current_user(request: Request, session: SessionDep) -> User:
    """Resolve the authenticated user from a PAT, Bearer token, or access_token cookie."""
    token = _extract_token(request)
    if token.startswith("cos_pat_"):
        from elliptic.modules.users.service import resolve_token_user  # noqa: PLC0415

        user = await resolve_token_user(session, token)
        if user is None:
            raise UnauthorizedError("Invalid or expired access token")
        if user.suspended_at is not None:
            raise UnauthorizedError("This account has been suspended")
        return user
    user_id = decode_token(token, "access")
    user = await session.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    if user.suspended_at is not None:
        raise UnauthorizedError("This account has been suspended")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_instance_admin(user: CurrentUser) -> User:
    """Gate an endpoint to instance (cross-org) admins (COS-223)."""
    if not user.is_instance_admin:
        raise ForbiddenError("Instance administrator access required")
    return user


InstanceAdmin = Annotated[User, Depends(require_instance_admin)]


@dataclass(frozen=True)
class OrgContext:
    """Verified tenant context: organization, membership row, and acting user."""

    org: Organization
    member: OrganizationMember
    user: User

    @property
    def role(self) -> OrgRole:
        return self.member.role


async def get_org_context(org_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> OrgContext:
    """Resolve the org and verify the caller's membership, or 404."""
    result = await session.execute(
        select(Organization, OrganizationMember)
        .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
        .where(Organization.id == org_id, OrganizationMember.user_id == user.id)
    )
    row = result.first()
    if row is None:
        raise NotFoundError("Organization not found")
    org, member = row
    return OrgContext(org=org, member=member, user=user)


OrgCtx = Annotated[OrgContext, Depends(get_org_context)]


def require_role(minimum: OrgRole) -> Callable[..., Awaitable[OrgContext]]:
    """Build a dependency enforcing a minimum org role on top of the org context."""

    async def dependency(ctx: OrgCtx) -> OrgContext:
        if ROLE_ORDER[ctx.role] < ROLE_ORDER[minimum]:
            raise ForbiddenError(f"Requires {minimum} role or higher")
        return ctx

    return dependency
