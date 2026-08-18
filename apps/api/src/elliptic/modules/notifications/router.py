"""Recipient-scoped notification endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.notifications import service
from elliptic.modules.notifications.schemas import (
    CatchUpOut,
    DeviceTokenIn,
    DeviceTokenOut,
    MarkSeenIn,
    MarkSeenOut,
    NotificationListOut,
    NotificationOut,
    NotificationPrefsIn,
    NotificationPrefsOut,
    NotificationStatusFilter,
    SnoozeIn,
    UnreadCountOut,
)
from elliptic.modules.notifications.service import notification_to_out

router = APIRouter(prefix="/orgs/{org_id}/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    ctx: OrgCtx,
    session: SessionDep,
    status: Annotated[NotificationStatusFilter, Query()] = "unread",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> SuccessResponse[NotificationListOut]:
    notifications, actor_names, unread = await service.list_for_user(
        session, ctx, status=status, limit=limit
    )
    items = [
        notification_to_out(n, actor_names.get(n.actor_id) if n.actor_id else None)
        for n in notifications
    ]
    return ok(NotificationListOut(items=items, unread_count=unread))


@router.get("/unread-count")
async def unread_count(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[UnreadCountOut]:
    count = await service.unread_count(session, ctx)
    return ok(UnreadCountOut(count=count))


@router.get("/catch-up")
async def catch_up(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[CatchUpOut]:
    data = await service.catch_up_digest(session, ctx, ctx.user.id)
    return ok(CatchUpOut.model_validate(data))


@router.post("/catch-up/mark-seen")
async def catch_up_mark_seen(
    payload: MarkSeenIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MarkSeenOut]:
    """Mark all of one catch-up entity's unread notifications read (COS-239)."""
    marked = await service.catch_up_mark_entity_read(
        session, ctx, ctx.user.id, payload.entity_type, payload.entity_id
    )
    return ok(MarkSeenOut(marked=marked))


@router.get("/preferences")
async def list_preferences(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[NotificationPrefsOut]]:
    prefs = await service.list_preferences(session, ctx)
    return ok([NotificationPrefsOut.model_validate(pref) for pref in prefs])


@router.put("/preferences")
async def set_preferences(
    payload: NotificationPrefsIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NotificationPrefsOut]:
    pref = await service.set_preferences(
        session,
        ctx,
        project_id=payload.project_id,
        values=payload.model_dump(exclude={"project_id"}),
    )
    return ok(NotificationPrefsOut.model_validate(pref), message="Preferences saved")


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NotificationOut]:
    notification, actor_name = await service.mark_read(session, ctx, notification_id)
    return ok(notification_to_out(notification, actor_name), message="Notification marked read")


@router.post("/read-all")
async def mark_all_read(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[None]:
    await service.mark_all_read(session, ctx)
    return ok(None, message="All notifications marked read")


@router.post("/{notification_id}/archive")
async def archive(
    notification_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NotificationOut]:
    notification, actor_name = await service.archive(session, ctx, notification_id)
    return ok(notification_to_out(notification, actor_name), message="Notification archived")


@router.post("/{notification_id}/snooze")
async def snooze(
    notification_id: uuid.UUID, payload: SnoozeIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NotificationOut]:
    notification, actor_name = await service.snooze(session, ctx, notification_id, payload.until)
    return ok(notification_to_out(notification, actor_name), message="Notification snoozed")


@router.post("/devices", status_code=status.HTTP_201_CREATED)
async def register_device(
    payload: DeviceTokenIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DeviceTokenOut]:
    """Register this device's push token (COS-222/290)."""
    row = await service.register_device_token(session, ctx, payload.platform, payload.token)
    return ok(DeviceTokenOut.model_validate(row), message="Device registered")


@router.delete("/devices/{token}")
async def revoke_device(token: str, ctx: OrgCtx, session: SessionDep) -> SuccessResponse[None]:
    await service.revoke_device_token(session, ctx, token)
    return ok(None, message="Device removed")
