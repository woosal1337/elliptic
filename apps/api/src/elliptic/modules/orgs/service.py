"""Organization, membership, and invitation business logic."""

import asyncio
import hashlib
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext
from elliptic.core.email import deliver_email
from elliptic.core.email_templates import render_invitation_email
from elliptic.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
)
from elliptic.modules.activity.service import record_activity
from elliptic.modules.auth.service import email_verification_required
from elliptic.modules.orgs.models import (
    ROLE_ORDER,
    Invitation,
    InviteStatus,
    Organization,
    OrganizationMember,
    OrgRole,
)
from elliptic.modules.orgs.schemas import InviteCreateIn, OrgCreateIn, OrgUpdateIn
from elliptic.modules.projects.models import (
    GUEST_ALLOWED_PROJECT_ROLES,
    Project,
    ProjectMember,
    ProjectRole,
)
from elliptic.modules.rbac_audit.models import RbacAction, RbacResourceScope
from elliptic.modules.rbac_audit.service import record_rbac_audit
from elliptic.modules.tasks.models import Task
from elliptic.modules.teams.models import TeamMember
from elliptic.modules.users.models import User
from elliptic.modules.workflow.service import seed_org_workflow

INVITE_TTL_DAYS = 7


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "org"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_org(session: AsyncSession, user: User, payload: OrgCreateIn) -> Organization:
    """Create an organization and make the creator its owner."""
    from elliptic.modules.instance.service import workspace_creation_allowed  # noqa: PLC0415

    if not user.is_instance_admin and not await workspace_creation_allowed(session):
        raise ForbiddenError("Workspace creation is disabled on this instance")
    slug = _slugify(payload.name)
    existing = await session.scalar(select(Organization).where(Organization.slug == slug))
    if existing is not None:
        slug = f"{slug}-{secrets.token_hex(3)}"
    org = Organization(name=payload.name, slug=slug, description=payload.description)
    session.add(org)
    await session.flush()
    member = OrganizationMember(org_id=org.id, user_id=user.id, role=OrgRole.OWNER)
    session.add(member)
    await seed_org_workflow(session, org.id)
    await record_activity(
        session,
        org_id=org.id,
        entity_type="organization",
        entity_id=org.id,
        event_type="created",
        actor_id=user.id,
        payload={"name": org.name},
    )
    return org


async def delete_org(session: AsyncSession, ctx: OrgContext) -> None:
    """Delete the organization and everything scoped to it.

    Every org-scoped table declares ``ON DELETE CASCADE`` on ``org_id``, so a
    single delete on the organization row removes members, projects, tasks,
    notes, meetings, activity, MCP grants, and the rest at the database level.
    """
    await session.execute(delete(Organization).where(Organization.id == ctx.org.id))


async def list_user_orgs(session: AsyncSession, user: User) -> list[Organization]:
    """List organizations the user belongs to."""
    result = await session.scalars(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
        .where(OrganizationMember.user_id == user.id)
        .order_by(Organization.created_at)
    )
    return list(result)


async def update_org(session: AsyncSession, ctx: OrgContext, payload: OrgUpdateIn) -> Organization:
    """Apply updates to the organization."""
    org = ctx.org
    if payload.name is not None:
        org.name = payload.name
    if payload.description is not None:
        org.description = payload.description
    if payload.ai_enabled is not None:
        org.ai_enabled = payload.ai_enabled
    if payload.block_backward_transitions is not None:
        org.block_backward_transitions = payload.block_backward_transitions
    if payload.residency_region is not None:
        org.residency_region = payload.residency_region or None
    if payload.compliance_frameworks is not None:
        org.compliance_frameworks = payload.compliance_frameworks
    if payload.data_controller is not None:
        org.data_controller = payload.data_controller or None
    if payload.dpo_contact is not None:
        org.dpo_contact = payload.dpo_contact or None
    await record_activity(
        session,
        org_id=org.id,
        entity_type="organization",
        entity_id=org.id,
        event_type="updated",
        actor_id=ctx.user.id,
    )
    await session.flush()
    return org


async def list_members(
    session: AsyncSession, ctx: OrgContext
) -> list[tuple[OrganizationMember, User]]:
    """List memberships with their user rows."""
    result = await session.execute(
        select(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .where(OrganizationMember.org_id == ctx.org.id)
        .order_by(OrganizationMember.created_at)
    )
    return [(member, user) for member, user in result.all()]


async def _get_member(
    session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID
) -> OrganizationMember:
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("Member not found")
    return member


async def _count_owners(session: AsyncSession, org_id: uuid.UUID) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(OrganizationMember)
            .where(OrganizationMember.org_id == org_id, OrganizationMember.role == OrgRole.OWNER)
        )
        or 0
    )


async def update_member_role(
    session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID, role: OrgRole
) -> OrganizationMember:
    """Change a member's role, restricting owner-level changes to owners.

    A member may never change their own role: this prevents an admin from
    self-demoting out of management and an owner from self-demoting while a
    second owner exists. The last-owner protection below still applies to
    role changes targeting other members.
    """
    member = await _get_member(session, ctx, user_id)
    role_before = member.role.value
    if user_id == ctx.user.id:
        raise ForbiddenError("You cannot change your own role")
    if ctx.role != OrgRole.OWNER and OrgRole.OWNER in (member.role, role):
        raise ForbiddenError("Only an owner can grant or modify an owner role")
    if (
        member.role == OrgRole.OWNER
        and role != OrgRole.OWNER
        and await _count_owners(session, ctx.org.id) <= 1
    ):
        raise BadRequestError("Cannot demote the last owner")
    member.role = role
    if role is OrgRole.GUEST:
        await session.execute(
            update(ProjectMember)
            .where(
                ProjectMember.org_id == ctx.org.id,
                ProjectMember.user_id == user_id,
                ProjectMember.role.notin_(GUEST_ALLOWED_PROJECT_ROLES),
            )
            .values(role=ProjectRole.COMMENTER)
        )
        await session.execute(
            update(Task)
            .where(Task.org_id == ctx.org.id, Task.assignee_id == user_id)
            .values(assignee_id=None)
        )
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="organization",
        entity_id=ctx.org.id,
        event_type="member_role_changed",
        actor_id=ctx.user.id,
        payload={"user_id": str(user_id), "role": role},
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.ORG_ROLE_CHANGED,
        resource_scope=RbacResourceScope.ORG,
        resource_id=ctx.org.id,
        subject_user_id=user_id,
        role_before=role_before,
        role_after=role.value,
    )
    await session.flush()
    return member


async def remove_member(session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID) -> None:
    """Remove a member from the organization, restricting owner removal to owners.

    Team and project memberships have no foreign key to the org membership row,
    so removing a user from the org also deletes that user's TeamMember and
    ProjectMember rows within the same org, in this transaction, to avoid stale
    cross-tenant assignments.
    """
    member = await _get_member(session, ctx, user_id)
    role_before = member.role.value
    if member.role == OrgRole.OWNER and ctx.role != OrgRole.OWNER:
        raise ForbiddenError("Only an owner can remove an owner")
    if member.role == OrgRole.OWNER and await _count_owners(session, ctx.org.id) <= 1:
        raise BadRequestError("Cannot remove the last owner")
    await session.execute(
        delete(TeamMember).where(TeamMember.org_id == ctx.org.id, TeamMember.user_id == user_id)
    )
    await session.execute(
        delete(ProjectMember).where(
            ProjectMember.org_id == ctx.org.id, ProjectMember.user_id == user_id
        )
    )
    await session.delete(member)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="organization",
        entity_id=ctx.org.id,
        event_type="member_removed",
        actor_id=ctx.user.id,
        payload={"user_id": str(user_id)},
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.MEMBER_REMOVED,
        resource_scope=RbacResourceScope.ORG,
        resource_id=ctx.org.id,
        subject_user_id=user_id,
        role_before=role_before,
    )
    await session.flush()


async def _send_invite_email(
    ctx: OrgContext,
    email: str,
    token: str,
    role: OrgRole,
    project: Project | None,
) -> None:
    """Render and send the invitation email; never block invite creation on it."""
    try:
        settings = get_settings()
        accept_url = f"{settings.app_base_url.rstrip('/')}/invite/{token}"
        subject, html = render_invitation_email(
            inviter_name=ctx.user.full_name,
            org_name=ctx.org.name,
            role=role.value,
            accept_url=accept_url,
            expires_in=f"{INVITE_TTL_DAYS} days",
            app_url=settings.app_base_url.rstrip("/"),
            project_name=project.name if project else None,
        )
        await asyncio.to_thread(deliver_email, email, subject, accept_url, html=html)
    except Exception:
        logger.exception("Failed to send invitation email to {}", email)


async def create_invite(
    session: AsyncSession, ctx: OrgContext, payload: InviteCreateIn
) -> tuple[Invitation, str]:
    """Create an invitation and return it with the one-time token."""
    if payload.role == OrgRole.OWNER and ctx.role != OrgRole.OWNER:
        raise ForbiddenError("Only an owner can invite a member as owner")
    email = payload.email.lower()
    member_exists = await session.scalar(
        select(OrganizationMember)
        .join(User, User.id == OrganizationMember.user_id)
        .where(OrganizationMember.org_id == ctx.org.id, User.email == email)
    )
    if member_exists is not None:
        raise ConflictError("User is already a member of this organization")
    pending = await session.scalar(
        select(Invitation).where(
            Invitation.org_id == ctx.org.id,
            Invitation.email == email,
            Invitation.status == InviteStatus.PENDING,
        )
    )
    if pending is not None:
        raise ConflictError("A pending invitation for this email already exists")
    project: Project | None = None
    if payload.project_id is not None:
        project = await session.get(Project, payload.project_id)
        if project is None or project.org_id != ctx.org.id:
            raise BadRequestError("Project not found in this organization")
    token = secrets.token_urlsafe(32)
    invite = Invitation(
        org_id=ctx.org.id,
        email=email,
        role=payload.role,
        token_hash=_hash_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS),
        invited_by=ctx.user.id,
        project_id=payload.project_id,
    )
    session.add(invite)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="organization",
        entity_id=ctx.org.id,
        event_type="invite_created",
        actor_id=ctx.user.id,
        payload={
            "email": email,
            "role": payload.role,
            "project_id": str(payload.project_id) if payload.project_id else None,
        },
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.MEMBER_INVITED,
        resource_scope=RbacResourceScope.ORG,
        resource_id=ctx.org.id,
        role_after=payload.role.value,
        detail={"email": email},
    )
    await _send_invite_email(ctx, email, token, payload.role, project)
    return invite, token


async def list_invites(session: AsyncSession, ctx: OrgContext) -> list[Invitation]:
    """List invitations for the organization."""
    result = await session.scalars(
        select(Invitation)
        .where(Invitation.org_id == ctx.org.id)
        .order_by(Invitation.created_at.desc())
    )
    return list(result)


async def revoke_invite(session: AsyncSession, ctx: OrgContext, invite_id: uuid.UUID) -> Invitation:
    """Revoke a pending invitation."""
    invite = await session.scalar(
        select(Invitation).where(Invitation.id == invite_id, Invitation.org_id == ctx.org.id)
    )
    if invite is None:
        raise NotFoundError("Invitation not found")
    if invite.status != InviteStatus.PENDING:
        raise BadRequestError("Only pending invitations can be revoked")
    invite.status = InviteStatus.REVOKED
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="organization",
        entity_id=ctx.org.id,
        event_type="invite_revoked",
        actor_id=ctx.user.id,
        payload={"email": invite.email},
    )
    await session.flush()
    return invite


async def preview_invite(
    session: AsyncSession, token: str
) -> tuple[Invitation, Organization, InviteStatus]:
    """Resolve an invitation token to a preview, without accepting it.

    Returns the invitation, its organization, and the *effective* status: a
    pending invite past its expiry is reported as EXPIRED. Raises NotFoundError
    when the token matches no invitation (so an unknown/garbage token reads as
    an invalid link rather than a working accept screen).
    """
    invite = await session.scalar(
        select(Invitation).where(Invitation.token_hash == _hash_token(token))
    )
    if invite is None:
        raise NotFoundError("Invitation not found")
    org = await session.get(Organization, invite.org_id)
    if org is None:
        raise NotFoundError("Organization not found")
    effective = invite.status
    if effective == InviteStatus.PENDING and invite.expires_at < datetime.now(UTC):
        effective = InviteStatus.EXPIRED
    return invite, org, effective


async def accept_invite(session: AsyncSession, user: User, token: str) -> Organization:
    """Accept an invitation by token, joining the user to the organization.

    A pending owner/admin invite must not grant elevated authority once the
    inviter has lost it. At accept time the invited role is re-validated against
    the current org state: the granted role is capped at OWNER, and any
    owner/admin invite is honored only if the inviter is still a member who
    legitimately holds that role or higher. If the inviter has been demoted or
    removed, the elevated grant is rejected as stale.
    """
    if email_verification_required() and not user.email_verified:
        raise ForbiddenError("Verify your email before accepting the invitation")
    invite = await session.scalar(
        select(Invitation).where(Invitation.token_hash == _hash_token(token))
    )
    if invite is None or invite.status != InviteStatus.PENDING:
        raise NotFoundError("Invitation not found")
    if invite.email.lower() != user.email.lower():
        raise ForbiddenError("This invitation was issued to a different email")
    if invite.expires_at < datetime.now(UTC):
        invite.status = InviteStatus.EXPIRED
        await session.flush()
        raise BadRequestError("Invitation has expired")
    org = await session.get(Organization, invite.org_id)
    if org is None:
        raise NotFoundError("Organization not found")
    existing = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org.id, OrganizationMember.user_id == user.id
        )
    )
    if existing is not None:
        raise ConflictError("You are already a member of this organization")
    granted_role = (
        invite.role if ROLE_ORDER[invite.role] <= ROLE_ORDER[OrgRole.OWNER] else OrgRole.OWNER
    )
    if ROLE_ORDER[granted_role] >= ROLE_ORDER[OrgRole.ADMIN]:
        inviter = await session.scalar(
            select(OrganizationMember).where(
                OrganizationMember.org_id == org.id,
                OrganizationMember.user_id == invite.invited_by,
            )
        )
        if inviter is None or ROLE_ORDER[inviter.role] < ROLE_ORDER[granted_role]:
            raise ForbiddenError("The inviter no longer has authority to grant this role")
    session.add(OrganizationMember(org_id=org.id, user_id=user.id, role=granted_role))
    if invite.project_id is not None:
        project = await session.get(Project, invite.project_id)
        if project is not None and project.org_id == org.id:
            already_member = await session.scalar(
                select(ProjectMember).where(
                    ProjectMember.project_id == invite.project_id,
                    ProjectMember.user_id == user.id,
                )
            )
            if already_member is None:
                project_role = (
                    ProjectRole.COMMENTER if granted_role is OrgRole.GUEST else ProjectRole.MEMBER
                )
                session.add(
                    ProjectMember(
                        org_id=org.id,
                        project_id=invite.project_id,
                        user_id=user.id,
                        role=project_role,
                    )
                )
    invite.status = InviteStatus.ACCEPTED
    invite.accepted_by = user.id
    invite.accepted_at = datetime.now(UTC)
    await record_activity(
        session,
        org_id=org.id,
        entity_type="organization",
        entity_id=org.id,
        event_type="member_added",
        actor_id=user.id,
        payload={"user_id": str(user.id), "role": granted_role},
    )
    record_rbac_audit(
        session,
        org_id=org.id,
        actor_id=user.id,
        action=RbacAction.MEMBER_ADDED,
        resource_scope=RbacResourceScope.ORG,
        resource_id=org.id,
        subject_user_id=user.id,
        role_after=granted_role.value,
    )
    await session.flush()
    return org


_BILLABLE_ROLES = (OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER)


async def seat_usage(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:
    """Seat accounting: billable (owner/admin/member) vs free (guest) seats (COS-207)."""
    rows = await session.execute(
        select(OrganizationMember.role, func.count())
        .where(OrganizationMember.org_id == ctx.org.id)
        .group_by(OrganizationMember.role)
    )
    by_role: dict[str, int] = {role.value: 0 for role in OrgRole}
    for role, count in rows:
        by_role[role.value] = count
    billable = sum(by_role[r.value] for r in _BILLABLE_ROLES)
    free = sum(
        count for role, count in by_role.items() if role not in {r.value for r in _BILLABLE_ROLES}
    )
    from elliptic.modules.ai.models import AIUser  # noqa: PLC0415

    bot_users = int(
        await session.scalar(
            select(func.count()).where(AIUser.org_id == ctx.org.id, AIUser.is_active.is_(True))
        )
        or 0
    )
    return {
        "billable_seats": billable,
        "free_seats": free,
        "total_members": billable + free,
        "bot_users": bot_users,
        "by_role": by_role,
        "billable_roles": [r.value for r in _BILLABLE_ROLES],
    }


async def onboarding_checklist(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:
    """Compute get-started progress from real workspace data (COS-136)."""
    from elliptic.modules.ai.models import AIProviderKey  # noqa: PLC0415
    from elliptic.modules.cycles.models import Cycle  # noqa: PLC0415
    from elliptic.modules.notes.models import Note  # noqa: PLC0415
    from elliptic.modules.projects.models import Project  # noqa: PLC0415
    from elliptic.modules.tasks.models import Task  # noqa: PLC0415

    org_id = ctx.org.id

    async def _count(column: "InstrumentedAttribute[uuid.UUID]") -> int:
        value = await session.scalar(select(func.count()).where(column == org_id))
        return int(value or 0)

    steps = [
        {
            "key": "create_project",
            "label": "Create your first project",
            "done": await _count(Project.org_id) > 0,
        },
        {"key": "create_task", "label": "Add a work item", "done": await _count(Task.org_id) > 0},
        {
            "key": "invite_member",
            "label": "Invite a teammate",
            "done": await _count(OrganizationMember.org_id) > 1,
        },
        {"key": "create_cycle", "label": "Plan a cycle", "done": await _count(Cycle.org_id) > 0},
        {
            "key": "write_note",
            "label": "Write a note or doc",
            "done": await _count(Note.org_id) > 0,
        },
        {
            "key": "connect_ai",
            "label": "Connect an AI provider",
            "done": await _count(AIProviderKey.org_id) > 0,
        },
    ]
    done = sum(1 for step in steps if step["done"])
    return {
        "steps": steps,
        "completed": done,
        "total": len(steps),
        "complete": done == len(steps),
    }


_PLANS: dict[str, dict[str, object]] = {
    "free": {
        "label": "Free",
        "seat_limit": 5,
        "ai_credits_per_seat": 500,
        "features": ["projects", "tasks", "notes", "search"],
    },
    "pro": {
        "label": "Pro",
        "seat_limit": 50,
        "ai_credits_per_seat": 1000,
        "features": ["projects", "tasks", "notes", "search", "dashboards", "automations", "cycles"],
    },
    "business": {
        "label": "Business",
        "seat_limit": 200,
        "ai_credits_per_seat": 2000,
        "features": [
            "projects",
            "tasks",
            "notes",
            "search",
            "dashboards",
            "automations",
            "cycles",
            "sso",
            "audit_log",
            "custom_roles",
        ],
    },
    "enterprise": {
        "label": "Enterprise",
        "seat_limit": 100000,
        "ai_credits_per_seat": 5000,
        "features": ["*"],
    },
}

PLAN_ORDER = ["free", "pro", "business", "enterprise"]


async def edition(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:
    """The org's edition: plan, seat limit vs billable usage, and feature gates (COS-197)."""
    plan = ctx.org.plan if ctx.org.plan in _PLANS else "free"
    catalog = _PLANS[plan]
    seats = await seat_usage(session, ctx)
    billable_value = seats["billable_seats"]
    billable = billable_value if isinstance(billable_value, int) else 0
    bots_value = seats["bot_users"]
    bot_users = bots_value if isinstance(bots_value, int) else 0
    seat_limit_value = catalog["seat_limit"]
    seat_limit = seat_limit_value if isinstance(seat_limit_value, int) else 0
    return {
        "plan": plan,
        "label": catalog["label"],
        "seat_limit": seat_limit,
        "billable_seats": billable,
        "bot_users": bot_users,
        "over_seat_limit": billable > seat_limit,
        "seats_remaining": max(seat_limit - billable, 0),
        "ai_credits_per_seat": catalog["ai_credits_per_seat"],
        "features": catalog["features"],
        "available_plans": [
            {
                "plan": name,
                "label": _PLANS[name]["label"],
                "seat_limit": _PLANS[name]["seat_limit"],
                "ai_credits_per_seat": _PLANS[name]["ai_credits_per_seat"],
            }
            for name in PLAN_ORDER
        ],
    }


async def set_plan(session: AsyncSession, ctx: OrgContext, plan: str) -> Organization:
    """Change the org's edition (admin) — COS-197."""
    if plan not in _PLANS:
        raise BadRequestError(f"Unknown plan: {plan}")
    ctx.org.plan = plan
    await session.flush()
    return ctx.org
