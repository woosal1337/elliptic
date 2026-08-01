"""Event backbone endpoints (COS-247)."""

import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.outbox import service
from elliptic.modules.outbox.schemas import (
    DispatchOut,
    EventOut,
    WebhookEndpointIn,
    WebhookEndpointOut,
)

router = APIRouter(prefix="/orgs/{org_id}", tags=["events"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("/webhooks")
async def list_webhooks(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[WebhookEndpointOut]]:
    rows = await service.list_endpoints(session, ctx)
    return ok([WebhookEndpointOut.model_validate(r) for r in rows])


@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
async def create_webhook(
    payload: WebhookEndpointIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[WebhookEndpointOut]:
    endpoint = await service.create_endpoint(
        session,
        ctx,
        url=payload.url,
        event_types=payload.event_types,
        secret=payload.secret or secrets.token_urlsafe(24),
    )
    return ok(WebhookEndpointOut.model_validate(endpoint), message="Webhook registered")


@router.delete("/webhooks/{endpoint_id}")
async def delete_webhook(
    endpoint_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_endpoint(session, ctx, endpoint_id)
    return ok(None, message="Webhook removed")


@router.get("/webhooks/events")
async def list_events(
    ctx: OrgCtx,
    session: SessionDep,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> SuccessResponse[list[EventOut]]:
    """The recent event-outbox log, optionally filtered by status (COS-247/274)."""
    rows = await service.list_events(session, ctx, status=status_filter)
    return ok([EventOut.model_validate(r) for r in rows])


@router.post("/webhooks/events/{event_id}/retry")
async def retry_event(
    event_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[EventOut]:
    """Requeue a dead-lettered event for another delivery attempt (COS-274)."""
    event = await service.requeue_event(session, ctx, event_id)
    return ok(EventOut.model_validate(event))


@router.post("/webhooks/events/dispatch")
async def dispatch_events(ctx: AdminCtx, session: SessionDep) -> SuccessResponse[DispatchOut]:
    """Drain pending outbox events to subscribed webhooks (COS-247)."""
    delivered = await service.dispatch_pending(session, ctx.org.id)
    return ok(DispatchOut(delivered=delivered))
