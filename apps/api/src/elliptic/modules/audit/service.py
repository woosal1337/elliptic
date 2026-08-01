"""Compliance audit-log queries over the activity event stream."""

import uuid
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.users.models import User


def _apply_filters(
    stmt: Select[Any],
    ctx: OrgContext,
    *,
    actor_id: uuid.UUID | None,
    entity_type: str | None,
    event_type: str | None,
    start: date | None,
    end: date | None,
) -> Select[Any]:
    stmt = stmt.where(ActivityEvent.org_id == ctx.org.id)
    if actor_id is not None:
        stmt = stmt.where(ActivityEvent.actor_id == actor_id)
    if entity_type:
        stmt = stmt.where(ActivityEvent.entity_type == entity_type)
    if event_type:
        stmt = stmt.where(ActivityEvent.event_type == event_type)
    if start is not None:
        stmt = stmt.where(ActivityEvent.created_at >= datetime.combine(start, time.min))
    if end is not None:
        stmt = stmt.where(ActivityEvent.created_at <= datetime.combine(end, time.max))
    return stmt


async def _actor_names(session: AsyncSession, events: list[ActivityEvent]) -> dict[uuid.UUID, str]:
    ids = {event.actor_id for event in events if event.actor_id is not None}
    if not ids:
        return {}
    rows = await session.execute(select(User.id, User.full_name).where(User.id.in_(ids)))
    return {row[0]: row[1] for row in rows}


def _changes(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Surface the meaningful before/after fields from an event payload."""
    if not payload:
        return {}
    return {key: value for key, value in payload.items() if key not in {"identifier", "title"}}


async def query_audit(
    session: AsyncSession,
    ctx: OrgContext,
    page: PageParams,
    *,
    actor_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    event_type: str | None = None,
    start: date | None = None,
    end: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Return filtered audit entries (newest first) + the total count."""
    base = _apply_filters(
        select(ActivityEvent),
        ctx,
        actor_id=actor_id,
        entity_type=entity_type,
        event_type=event_type,
        start=start,
        end=end,
    )
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
        .limit(page.limit)
        .offset(page.offset)
    )
    events = list(result)
    names = await _actor_names(session, events)
    entries = [
        {
            "id": event.id,
            "created_at": event.created_at,
            "actor_id": event.actor_id,
            "actor_name": names.get(event.actor_id, "Unknown") if event.actor_id else "System",
            "actor_type": "user" if event.actor_id else "system",
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "event_type": event.event_type,
            "project_id": event.project_id,
            "changes": _changes(event.payload),
        }
        for event in events
    ]
    return entries, total
