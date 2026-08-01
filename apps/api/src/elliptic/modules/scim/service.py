"""SCIM 2.0 provisioning service (COS-184)."""

import hashlib
import secrets
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.core.security import hash_password
from elliptic.modules.orgs.models import OrganizationMember, OrgRole
from elliptic.modules.outbox.service import capture
from elliptic.modules.scim.models import ScimToken
from elliptic.modules.users.models import User


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


async def get_token(session: AsyncSession, org_id: uuid.UUID) -> ScimToken | None:
    token: ScimToken | None = await session.scalar(
        select(ScimToken).where(ScimToken.org_id == org_id, ScimToken.revoked_at.is_(None))
    )
    return token


async def mint_token(session: AsyncSession, org_id: uuid.UUID) -> tuple[ScimToken, str]:
    """Revoke any existing token and mint a fresh one; returns the raw secret once."""
    existing = await get_token(session, org_id)
    if existing is not None:
        existing.revoked_at = utcnow()
    raw = f"scim_{secrets.token_urlsafe(32)}"
    token = ScimToken(org_id=org_id, prefix=raw[:16], token_hash=_hash(raw))
    session.add(token)
    await session.flush()
    return token, raw


async def revoke_token(session: AsyncSession, org_id: uuid.UUID) -> None:
    token = await get_token(session, org_id)
    if token is not None:
        token.revoked_at = utcnow()
        await session.flush()


async def resolve_token(session: AsyncSession, raw: str) -> ScimToken | None:
    token = await session.scalar(
        select(ScimToken).where(ScimToken.token_hash == _hash(raw), ScimToken.revoked_at.is_(None))
    )
    if token is not None:
        token.last_used_at = utcnow()
    return token


def user_resource(user: User, member: OrganizationMember | None) -> dict[str, object]:
    given, _, family = (user.full_name or "").partition(" ")
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "id": str(user.id),
        "userName": user.email,
        "name": {"givenName": given, "familyName": family},
        "emails": [{"value": user.email, "primary": True}],
        "active": member is not None and user.is_active,
        "meta": {"resourceType": "User"},
    }


async def list_users(session: AsyncSession, org_id: uuid.UUID) -> list[dict[str, object]]:
    rows = await session.execute(
        select(User, OrganizationMember)
        .join(OrganizationMember, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.org_id == org_id)
    )
    return [user_resource(u, m) for u, m in rows.all()]


async def get_user(
    session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID
) -> dict[str, object]:
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("User not provisioned in this org")
    user = await session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user_resource(user, member)


async def provision_user(
    session: AsyncSession, org_id: uuid.UUID, payload: dict[str, object]
) -> dict[str, object]:
    """Create/JIT a User + OrganizationMember from a SCIM User resource (COS-184)."""
    email = str(payload.get("userName") or "").strip().lower()
    emails = payload.get("emails")
    if not email and isinstance(emails, list) and emails:
        first = emails[0]
        if isinstance(first, dict):
            email = str(first.get("value") or "").strip().lower()
    if not email:
        raise NotFoundError("userName/email is required")

    name = payload.get("name")
    full_name = ""
    if isinstance(name, dict):
        full_name = " ".join(str(p) for p in [name.get("givenName"), name.get("familyName")] if p)

    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            full_name=full_name or email.split("@")[0],
            email_verified=True,
        )
        session.add(user)
        await session.flush()
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id, OrganizationMember.user_id == user.id
        )
    )
    if member is None:
        member = OrganizationMember(org_id=org_id, user_id=user.id, role=OrgRole.MEMBER)
        session.add(member)
        await session.flush()
    await capture(
        session,
        org_id=org_id,
        entity_type="user",
        entity_id=user.id,
        event_type="scim.user.provisioned",
        data={"email": email},
    )
    return user_resource(user, member)


async def set_active(
    session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID, active: bool
) -> dict[str, object]:
    """Activate/deactivate a provisioned user: drops org membership when inactive.

    Authored content is preserved — only the membership is removed (COS-184).
    """
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id, OrganizationMember.user_id == user_id
        )
    )
    user = await session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    if not active and member is not None:
        owners = await session.scalar(
            select(func.count())
            .select_from(OrganizationMember)
            .where(OrganizationMember.org_id == org_id, OrganizationMember.role == OrgRole.OWNER)
        )
        if not (member.role == OrgRole.OWNER and (owners or 0) <= 1):
            await session.delete(member)
            member = None
            await capture(
                session,
                org_id=org_id,
                entity_type="user",
                entity_id=user.id,
                event_type="scim.user.deactivated",
                data={"email": user.email},
            )
    elif active and member is None:
        member = OrganizationMember(org_id=org_id, user_id=user.id, role=OrgRole.MEMBER)
        session.add(member)
    await session.flush()
    return user_resource(user, member)
