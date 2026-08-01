"""Resolve an MCP access token into a verified, live principal."""

import uuid
from dataclasses import dataclass

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ForbiddenError, UnauthorizedError
from elliptic.modules.mcp_auth import scopes as scope_catalog
from elliptic.modules.mcp_auth.models import GrantStatus, OAuthAccessToken, OAuthGrant
from elliptic.modules.mcp_auth.tokens import verify_access_token, verify_multi_org_token
from elliptic.modules.orgs.models import Organization, OrganizationMember, OrgRole
from elliptic.modules.users.models import User


@dataclass(frozen=True)
class McpPrincipal:
    """A verified MCP caller: the acting user, effective scopes, and org reach.

    A single-org principal carries a fixed ``org``/``member``. A multi-org principal
    (``cross_org=True``) carries no fixed org; the target org is chosen per call and
    its membership is resolved live via :func:`org_context_for`.
    """

    user: User
    scopes: frozenset[str]
    client_id: str
    org: Organization | None = None
    member: OrganizationMember | None = None
    cross_org: bool = False

    @property
    def role(self) -> OrgRole:
        if self.member is None:
            raise UnauthorizedError("No organization context on this call")
        return self.member.role

    @property
    def org_context(self) -> OrgContext:
        if self.org is None or self.member is None:
            raise UnauthorizedError("No organization context on this call")
        return OrgContext(org=self.org, member=self.member, user=self.user)

    def require_scope(self, scope: str) -> None:
        """Raise insufficient_scope unless the token carries the scope."""
        if scope not in self.scopes:
            raise ForbiddenError(f"insufficient_scope: {scope}")


async def org_context_for(session: AsyncSession, user: User, org_id: uuid.UUID) -> OrgContext:
    """Resolve a live OrgContext for a multi-org principal targeting one org.

    Runs the same membership join the single-org path enforces, so a user removed
    from an org loses access immediately regardless of the token's reach.
    """
    row = (
        await session.execute(
            select(Organization, OrganizationMember)
            .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
            .where(Organization.id == org_id, OrganizationMember.user_id == user.id)
        )
    ).first()
    if row is None:
        raise UnauthorizedError("Not a member of the requested organization")
    org, member = row
    return OrgContext(org=org, member=member, user=user)


async def resolve_token(session: AsyncSession, token: str) -> McpPrincipal:
    """Validate signature/audience, registry, grant, user, and (single-org) membership.

    A personal access token (``cos_pat_``) is accepted for the documented HTTP+PAT
    MCP transport (COS-235): it acts as the owning user across all their orgs with
    full scopes, exactly like a logged-in session.
    """
    if token.startswith("cos_pat_"):
        from elliptic.modules.users.service import resolve_token_user  # noqa: PLC0415

        user = await resolve_token_user(session, token)
        if user is None:
            raise UnauthorizedError("Invalid or expired access token")
        return McpPrincipal(
            user=user,
            scopes=frozenset(scope_catalog.ALL_SCOPES),
            client_id="personal-access-token",
            cross_org=True,
        )

    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid token") from exc

    cross_org = bool(unverified.get("cross_org"))
    if cross_org:
        claims = await verify_multi_org_token(session, token)
    else:
        org_id = uuid.UUID(str(unverified.get("org_id")))
        claims = await verify_access_token(session, token, org_id)

    record = await session.scalar(
        select(OAuthAccessToken).where(OAuthAccessToken.jti == uuid.UUID(str(claims["jti"])))
    )
    if record is None or record.revoked_at is not None:
        raise UnauthorizedError("Token revoked")
    grant = await session.get(OAuthGrant, record.grant_id)
    if grant is None or grant.status != GrantStatus.ACTIVE:
        raise UnauthorizedError("Grant revoked")

    user = await session.get(User, uuid.UUID(str(claims["sub"])))
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    token_scopes = scope_catalog.parse_scope(str(claims.get("scope", "")))
    effective = scope_catalog.intersect_scopes(grant.scopes, token_scopes)

    if cross_org:
        return McpPrincipal(
            user=user,
            scopes=frozenset(effective),
            client_id=str(claims["client_id"]),
            cross_org=True,
        )

    row = (
        await session.execute(
            select(Organization, OrganizationMember)
            .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
            .where(Organization.id == org_id, OrganizationMember.user_id == user.id)
        )
    ).first()
    if row is None:
        raise UnauthorizedError("Membership revoked")
    org, member = row
    return McpPrincipal(
        user=user,
        scopes=frozenset(effective),
        client_id=str(claims["client_id"]),
        org=org,
        member=member,
    )
