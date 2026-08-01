"""Project webhook endpoints (admin-gated)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.webhooks import service
from elliptic.modules.webhooks.catalog import EVENT_CATALOG
from elliptic.modules.webhooks.schemas import (
    EventCatalogOut,
    WebhookCreatedOut,
    WebhookCreateIn,
    WebhookOut,
    WebhookTestResult,
    WebhookUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/webhooks", tags=["webhooks"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("")
async def list_webhooks(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[list[WebhookOut]]:
    webhooks = await service.list_webhooks(session, ctx, project_id)
    return ok([service.to_out(wh) for wh in webhooks])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_webhook(
    project_id: uuid.UUID, payload: WebhookCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[WebhookCreatedOut]:
    wh = await service.create_webhook(session, ctx, project_id, payload)
    created = WebhookCreatedOut(**service.to_out(wh).model_dump(), signing_secret=wh.secret)
    return ok(created, message="Webhook created")


@router.get("/catalog")
async def event_catalog(
    project_id: uuid.UUID,  # noqa: ARG001 — path param required for routing
    ctx: AdminCtx,  # noqa: ARG001 — dependency enforces the admin gate
    session: SessionDep,  # noqa: ARG001 — present for handler-signature parity
) -> SuccessResponse[EventCatalogOut]:
    return ok(EventCatalogOut(groups=EVENT_CATALOG))


@router.get("/{webhook_id}")
async def get_webhook(
    project_id: uuid.UUID, webhook_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[WebhookOut]:
    wh = await service.get_webhook(session, ctx, project_id, webhook_id)
    return ok(service.to_out(wh))


@router.patch("/{webhook_id}")
async def update_webhook(
    project_id: uuid.UUID,
    webhook_id: uuid.UUID,
    payload: WebhookUpdateIn,
    ctx: AdminCtx,
    session: SessionDep,
) -> SuccessResponse[WebhookOut]:
    wh = await service.update_webhook(session, ctx, project_id, webhook_id, payload)
    return ok(service.to_out(wh), message="Webhook updated")


@router.delete("/{webhook_id}")
async def delete_webhook(
    project_id: uuid.UUID, webhook_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_webhook(session, ctx, project_id, webhook_id)
    return ok(None, message="Webhook deleted")


@router.post("/{webhook_id}/test")
async def test_webhook(
    project_id: uuid.UUID, webhook_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[WebhookTestResult]:
    result = await service.test_send(session, ctx, project_id, webhook_id)
    return ok(result)
