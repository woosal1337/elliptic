"""Authenticate MCP tool calls and bridge them to the shared service layer."""

import contextlib
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass

from fastmcp.server.dependencies import get_http_request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.database import session_factory
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, UnauthorizedError
from elliptic.modules.mcp_auth.resolver import McpPrincipal, org_context_for, resolve_token
from elliptic.modules.orgs.models import Organization, OrganizationMember


@dataclass(frozen=True)
class McpCall:
    """The resolved context for one org-scoped MCP tool invocation."""

    principal: McpPrincipal
    ctx: OrgContext
    session: AsyncSession


@dataclass(frozen=True)
class McpUserCall:
    """The resolved context for a user-level MCP tool invocation (no org).

    Used by tools that act on the user across organizations (create_org,
    list_my_orgs); read ``principal.user``.
    """

    principal: McpPrincipal
    session: AsyncSession


def _bearer_token() -> str:
    request = get_http_request()
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization[len("bearer ") :].strip()
    api_key = request.headers.get("x-api-key", "").strip()
    if api_key:
        return api_key
    raise UnauthorizedError("Missing bearer token")


async def _default_org_id(session: AsyncSession, principal: McpPrincipal) -> uuid.UUID:
    """The deterministic fallback org for a multi-org call with no explicit org_id.

    Resolves to the user's earliest-joined organization. Tools that target a
    specific org should always pass ``org_id``; this only keeps un-targeted tools
    functional under a multi-org token.
    """
    org_id = await session.scalar(
        select(Organization.id)
        .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
        .where(OrganizationMember.user_id == principal.user.id)
        .order_by(Organization.created_at)
        .limit(1)
    )
    if org_id is None:
        raise BadRequestError("You do not belong to any organization")
    return org_id


async def _resolve_ctx(
    session: AsyncSession, principal: McpPrincipal, org_id: str | None
) -> OrgContext:
    """Resolve the org context for an org-scoped call, rejecting a bad target.

    Multi-org principals target ``org_id`` (or the default org); single-org
    principals reject a mismatched ``org_id``.
    """
    if principal.cross_org:
        target = uuid.UUID(org_id) if org_id else await _default_org_id(session, principal)
        return await org_context_for(session, principal.user, target)
    ctx = principal.org_context
    if org_id is not None and str(ctx.org.id) != org_id:
        raise BadRequestError("This token is scoped to a single organization; omit org_id")
    return ctx


@contextlib.asynccontextmanager
async def mcp_call(required_scope: str, org_id: str | None = None) -> AsyncIterator[McpCall]:
    """Authenticate the caller, enforce a scope, resolve the org, and own the txn.

    For a single-org token the org is fixed (and a mismatched ``org_id`` is rejected).
    For a multi-org token the target org is ``org_id`` when given, else the user's
    default org; membership is re-verified live before the tool runs. Tools do not
    commit; this boundary commits on success and rolls back on error.
    """
    token = _bearer_token()
    async with session_factory() as session:
        try:
            principal = await resolve_token(session, token)
            principal.require_scope(required_scope)
            ctx = await _resolve_ctx(session, principal, org_id)
            yield McpCall(principal=principal, ctx=ctx, session=session)
            await session.commit()
        except BaseException:
            await session.rollback()
            raise


@contextlib.asynccontextmanager
async def mcp_call_user(required_scope: str) -> AsyncIterator[McpUserCall]:
    """Authenticate and enforce a user-level scope WITHOUT resolving an org context.

    For tools that act on the user across organizations (create_org, list_my_orgs);
    read ``call.principal.user``.
    """
    token = _bearer_token()
    async with session_factory() as session:
        try:
            principal = await resolve_token(session, token)
            principal.require_scope(required_scope)
            yield McpUserCall(principal=principal, session=session)
            await session.commit()
        except BaseException:
            await session.rollback()
            raise
