"""Compliance posture, GDPR data-subject export, and erasure requests (COS-233)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.comments.models import Comment
from elliptic.modules.notes.models import Note
from elliptic.modules.orgs.models import OrganizationMember
from elliptic.modules.tasks.models import Task
from elliptic.modules.users.models import User


async def posture(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:  # noqa: ARG001
    """A summary of the org's declared compliance + data-residency posture."""
    org = ctx.org
    return {
        "residency_region": org.residency_region,
        "compliance_frameworks": list(org.compliance_frameworks or []),
        "data_controller": org.data_controller,
        "dpo_contact": org.dpo_contact,
    }


async def _count(session: AsyncSession, column: object, org_id: uuid.UUID) -> int:
    value = await session.scalar(select(func.count()).where(column == org_id))  # type: ignore[arg-type]
    return int(value or 0)


async def data_subject_export(
    session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID
) -> dict[str, object]:
    """A GDPR data-subject bundle: the user's PII + content references (COS-233)."""
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("Member not found")
    user = await session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")

    authored_tasks = int(
        await session.scalar(
            select(func.count()).where(Task.org_id == ctx.org.id, Task.created_by == user_id)
        )
        or 0
    )
    authored_notes = int(
        await session.scalar(
            select(func.count()).where(Note.org_id == ctx.org.id, Note.created_by == user_id)
        )
        or 0
    )
    authored_comments = int(
        await session.scalar(
            select(func.count()).where(Comment.org_id == ctx.org.id, Comment.author_id == user_id)
        )
        or 0
    )

    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="organization",
        entity_id=ctx.org.id,
        event_type="data_subject_exported",
        actor_id=ctx.user.id,
        payload={"subject_id": str(user_id)},
    )
    return {
        "subject": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": member.role.value,
        },
        "content": {
            "authored_tasks": authored_tasks,
            "authored_notes": authored_notes,
            "authored_comments": authored_comments,
        },
    }


async def request_erasure(
    session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID, reason: str | None
) -> dict[str, object]:
    """Record an audited right-to-erasure request for review (COS-233)."""
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("Member not found")
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="organization",
        entity_id=ctx.org.id,
        event_type="erasure_requested",
        actor_id=ctx.user.id,
        payload={"subject_id": str(user_id), "reason": reason or ""},
    )
    return {"subject_id": str(user_id), "status": "pending_review"}
