"""RBAC audit trail: append-only recording + admin querying."""

import uuid
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.pagination import PageParams
from elliptic.modules.rbac_audit.models import RbacAction, RbacAuditEvent, RbacResourceScope
from elliptic.modules.users.models import User


def record_rbac_audit(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    action: RbacAction,
    resource_scope: RbacResourceScope,
    resource_id: uuid.UUID,
    subject_user_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    role_before: str | None = None,
    role_after: str | None = None,
    actor_type: str = "user",
    detail: dict[str, Any] | None = None,
) -> RbacAuditEvent:
    """Append an RBAC audit record. Does NOT flush — the caller's txn owns it."""
    event = RbacAuditEvent(
        org_id=org_id,
        actor_id=actor_id,
        actor_type=actor_type,
        subject_user_id=subject_user_id,
        resource_scope=resource_scope,
        resource_id=resource_id,
        project_id=project_id,
        action=action,
        role_before=role_before,
        role_after=role_after,
        detail=detail,
    )
    session.add(event)
    return event


def _apply_filters(
    stmt: Select[Any],
    ctx: OrgContext,
    *,
    actor_id: uuid.UUID | None,
    subject_user_id: uuid.UUID | None,
    resource_scope: RbacResourceScope | None,
    action: RbacAction | None,
    start: date | None,
    end: date | None,
) -> Select[Any]:
    stmt = stmt.where(RbacAuditEvent.org_id == ctx.org.id)
    if actor_id is not None:
        stmt = stmt.where(RbacAuditEvent.actor_id == actor_id)
    if subject_user_id is not None:
        stmt = stmt.where(RbacAuditEvent.subject_user_id == subject_user_id)
    if resource_scope is not None:
        stmt = stmt.where(RbacAuditEvent.resource_scope == resource_scope)
    if action is not None:
        stmt = stmt.where(RbacAuditEvent.action == action)
    if start is not None:
        stmt = stmt.where(RbacAuditEvent.created_at >= datetime.combine(start, time.min))
    if end is not None:
        stmt = stmt.where(RbacAuditEvent.created_at <= datetime.combine(end, time.max))
    return stmt


async def _names(session: AsyncSession, events: list[RbacAuditEvent]) -> dict[uuid.UUID, str]:
    ids = {e.actor_id for e in events if e.actor_id is not None}
    ids |= {e.subject_user_id for e in events if e.subject_user_id is not None}
    if not ids:
        return {}
    rows = await session.execute(select(User.id, User.full_name).where(User.id.in_(ids)))
    return {row[0]: row[1] for row in rows}


async def query_rbac_audit(
    session: AsyncSession,
    ctx: OrgContext,
    page: PageParams,
    *,
    actor_id: uuid.UUID | None = None,
    subject_user_id: uuid.UUID | None = None,
    resource_scope: RbacResourceScope | None = None,
    action: RbacAction | None = None,
    start: date | None = None,
    end: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Filtered RBAC audit records (newest first) + total count, names resolved."""
    base = _apply_filters(
        select(RbacAuditEvent),
        ctx,
        actor_id=actor_id,
        subject_user_id=subject_user_id,
        resource_scope=resource_scope,
        action=action,
        start=start,
        end=end,
    )
    total: int = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(RbacAuditEvent.created_at.desc(), RbacAuditEvent.id.desc())
        .limit(page.limit)
        .offset(page.offset)
    )
    events = list(result)
    names = await _names(session, events)
    entries = [
        {
            "id": e.id,
            "created_at": e.created_at,
            "actor_id": e.actor_id,
            "actor_name": names.get(e.actor_id, "Unknown") if e.actor_id else "System",
            "actor_type": e.actor_type,
            "subject_user_id": e.subject_user_id,
            "subject_name": names.get(e.subject_user_id) if e.subject_user_id else None,
            "resource_scope": e.resource_scope,
            "resource_id": e.resource_id,
            "project_id": e.project_id,
            "action": e.action,
            "role_before": e.role_before,
            "role_after": e.role_after,
            "detail": e.detail,
        }
        for e in events
    ]
    return entries, total
