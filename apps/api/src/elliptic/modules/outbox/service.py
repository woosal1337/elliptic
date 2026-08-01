"""Event outbox capture + webhook dispatch (COS-247)."""

import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.outbox.models import EventInitiatorType, EventOutbox, WebhookEndpoint

_MAX_ATTEMPTS = 5
_HTTP_ERROR_STATUS = 400


def _serialize(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


async def capture(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID | None,
    event_type: str,
    data: dict[str, Any] | None = None,
    initiator_type: str = EventInitiatorType.USER.value,
    initiator_id: uuid.UUID | None = None,
    idempotency_key: str | None = None,
) -> EventOutbox:
    """Append a domain event to the outbox in the caller's transaction (COS-247)."""
    event = EventOutbox(
        org_id=org_id,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        data=_serialize(data) if data else None,
        initiator_type=initiator_type,
        initiator_id=initiator_id,
        idempotency_key=idempotency_key,
    )
    session.add(event)
    return event


async def post_to_endpoint(url: str, body: str, signature: str) -> int:
    """Deliver one event to a webhook URL; returns the HTTP status (mocked in tests)."""
    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.post(
            url,
            content=body,
            headers={
                "Content-Type": "application/json",
                # Both names through the rename — see webhooks/sender.py.
                "X-Elliptic-Signature": signature,
                "X-CompanyOS-Signature": signature,
            },
        )
        return resp.status_code


async def dispatch_pending(session: AsyncSession, org_id: uuid.UUID, limit: int = 100) -> int:
    """Drain undelivered outbox rows, fanning each out to matching endpoints (COS-247).

    Returns the number of rows marked delivered. Idempotent: re-running only
    processes rows still lacking ``delivered_at``.
    """
    now = datetime.now(UTC)
    rows = list(
        await session.scalars(
            select(EventOutbox)
            .where(
                EventOutbox.org_id == org_id,
                EventOutbox.delivered_at.is_(None),
                EventOutbox.failed.is_(False),
                or_(
                    EventOutbox.next_attempt_at.is_(None),
                    EventOutbox.next_attempt_at <= now,
                ),
            )
            .order_by(EventOutbox.created_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    )
    endpoints = list(
        await session.scalars(
            select(WebhookEndpoint).where(
                WebhookEndpoint.org_id == org_id, WebhookEndpoint.enabled.is_(True)
            )
        )
    )

    delivered = 0
    for row in rows:
        row.attempts += 1
        targets = [ep for ep in endpoints if not ep.event_types or row.event_type in ep.event_types]
        if not targets:
            row.delivered_at = datetime.now(UTC)
            row.delivery_error = None
            row.next_attempt_at = None
            delivered += 1
            continue
        body = json.dumps(
            {
                "id": str(row.id),
                "event_type": row.event_type,
                "entity_type": row.entity_type,
                "entity_id": str(row.entity_id) if row.entity_id else None,
                "initiator_type": row.initiator_type,
                "data": row.data,
            }
        )
        error: str | None = None
        for ep in targets:
            signature = hmac.new(ep.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
            try:
                code = await post_to_endpoint(ep.url, body, signature)
                if code >= _HTTP_ERROR_STATUS:
                    error = f"{ep.url} returned {code}"
            except httpx.HTTPError as exc:
                error = f"{ep.url}: {exc}"
        if error is None:
            row.delivered_at = datetime.now(UTC)
            row.delivery_error = None
            row.next_attempt_at = None
            delivered += 1
        else:
            row.delivery_error = error
            if row.attempts >= _MAX_ATTEMPTS:
                row.failed = True
                row.next_attempt_at = None
            else:
                row.next_attempt_at = datetime.now(UTC) + timedelta(minutes=2**row.attempts)
    await session.flush()
    return delivered


async def requeue_event(session: AsyncSession, ctx: OrgContext, event_id: uuid.UUID) -> EventOutbox:
    """Reset a dead-lettered event for another delivery attempt (COS-274)."""
    event = await session.scalar(
        select(EventOutbox).where(EventOutbox.id == event_id, EventOutbox.org_id == ctx.org.id)
    )
    if event is None:
        raise NotFoundError("Event not found")
    event.failed = False
    event.attempts = 0
    event.next_attempt_at = None
    event.delivery_error = None
    await session.flush()
    return event


async def orgs_with_due_events(session: AsyncSession) -> list[uuid.UUID]:
    """Distinct org ids that have due, undelivered, non-failed outbox rows (COS-274)."""
    now = datetime.now(UTC)
    result = await session.scalars(
        select(EventOutbox.org_id)
        .where(
            EventOutbox.delivered_at.is_(None),
            EventOutbox.failed.is_(False),
            or_(EventOutbox.next_attempt_at.is_(None), EventOutbox.next_attempt_at <= now),
        )
        .distinct()
    )
    return list(result)


async def list_endpoints(session: AsyncSession, ctx: OrgContext) -> list[WebhookEndpoint]:
    result = await session.scalars(
        select(WebhookEndpoint)
        .where(WebhookEndpoint.org_id == ctx.org.id)
        .order_by(WebhookEndpoint.created_at)
    )
    return list(result)


async def create_endpoint(
    session: AsyncSession, ctx: OrgContext, *, url: str, event_types: list[str], secret: str
) -> WebhookEndpoint:
    endpoint = WebhookEndpoint(
        org_id=ctx.org.id, url=url, secret=secret, event_types=event_types, enabled=True
    )
    session.add(endpoint)
    await session.flush()
    return endpoint


async def delete_endpoint(session: AsyncSession, ctx: OrgContext, endpoint_id: uuid.UUID) -> None:
    endpoint = await session.scalar(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == endpoint_id, WebhookEndpoint.org_id == ctx.org.id
        )
    )
    if endpoint is None:
        raise NotFoundError("Webhook endpoint not found")
    await session.delete(endpoint)
    await session.flush()


async def list_events(
    session: AsyncSession, ctx: OrgContext, limit: int = 50, status: str | None = None
) -> list[EventOutbox]:
    conditions = [EventOutbox.org_id == ctx.org.id]
    if status == "delivered":
        conditions.append(EventOutbox.delivered_at.is_not(None))
    elif status == "failed":
        conditions.append(EventOutbox.failed.is_(True))
    elif status == "pending":
        conditions.append(EventOutbox.delivered_at.is_(None))
        conditions.append(EventOutbox.failed.is_(False))
    result = await session.scalars(
        select(EventOutbox).where(*conditions).order_by(EventOutbox.created_at.desc()).limit(limit)
    )
    return list(result)
