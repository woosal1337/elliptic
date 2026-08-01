"""Activity recording and feed queries."""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.models import ActivityEvent


async def record_activity(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    event_type: str,
    actor_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    payload: dict[str, Any] | None = None,
) -> ActivityEvent:
    """Append one activity event in the caller's transaction."""
    event = ActivityEvent(
        org_id=org_id,
        project_id=project_id,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        payload=payload,
    )
    session.add(event)
    from elliptic.modules.outbox.service import capture as capture_outbox  # noqa: PLC0415

    await capture_outbox(
        session,
        org_id=org_id,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=f"{entity_type}.{event_type}",
        data=payload,
        initiator_id=actor_id,
    )
    return event


async def list_org_feed(
    session: AsyncSession, ctx: OrgContext, page: PageParams
) -> tuple[list[ActivityEvent], int]:
    """Return the org-wide activity feed, newest first."""
    base = select(ActivityEvent).where(ActivityEvent.org_id == ctx.org.id)
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
        .limit(page.limit)
        .offset(page.offset)
    )
    return list(result), total


async def list_entity_feed(
    session: AsyncSession,
    ctx: OrgContext,
    entity_type: str,
    entity_id: uuid.UUID,
    page: PageParams,
) -> tuple[list[ActivityEvent], int]:
    """Return the activity feed for one entity, newest first."""
    base = select(ActivityEvent).where(
        ActivityEvent.org_id == ctx.org.id,
        ActivityEvent.entity_type == entity_type,
        ActivityEvent.entity_id == entity_id,
    )
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
        .limit(page.limit)
        .offset(page.offset)
    )
    return list(result), total
