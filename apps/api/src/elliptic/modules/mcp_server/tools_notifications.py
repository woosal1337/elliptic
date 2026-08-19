"""Notification read/write tools, scoped to the calling user's own notifications."""

import uuid
from datetime import datetime
from typing import Any

from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.notifications import service as notifications_service
from elliptic.modules.notifications.schemas import NotificationStatusFilter


@mcp.tool
async def list_notifications(
    status: NotificationStatusFilter = "unread",
    limit: int = 50,
    org_id: str | None = None,
) -> dict[str, Any]:
    """List the caller's own notifications by status (unread/all/archived), newest first.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notifications:read", org_id=org_id) as call:
        notifications, actor_names, unread = await notifications_service.list_for_user(
            call.session, call.ctx, status=status, limit=limit
        )
        serialized = await notifications_service.serialize_many(
            call.session, notifications, actor_names
        )
        items = [n.model_dump(mode="json") for n in serialized]
        return {"total": len(items), "items": items, "unread_count": unread}


@mcp.tool
async def unread_count(org_id: str | None = None) -> dict[str, Any]:
    """Return the caller's current unread notification count.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notifications:read", org_id=org_id) as call:
        count = await notifications_service.unread_count(call.session, call.ctx)
        return {"count": count}


@mcp.tool
async def mark_notification_read(notification_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Mark one of the caller's notifications as read.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notifications:write", org_id=org_id) as call:
        notification, actor_name = await notifications_service.mark_read(
            call.session, call.ctx, uuid.UUID(notification_id)
        )
        out = await notifications_service.serialize_one(call.session, notification, actor_name)
        return out.model_dump(mode="json")


@mcp.tool
async def mark_all_notifications_read(org_id: str | None = None) -> dict[str, Any]:
    """Mark all of the caller's unread notifications as read.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notifications:write", org_id=org_id) as call:
        await notifications_service.mark_all_read(call.session, call.ctx)
        return {"marked_all_read": True}


@mcp.tool
async def archive_notification(notification_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Archive one of the caller's notifications.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notifications:write", org_id=org_id) as call:
        notification, actor_name = await notifications_service.archive(
            call.session, call.ctx, uuid.UUID(notification_id)
        )
        out = await notifications_service.serialize_one(call.session, notification, actor_name)
        return out.model_dump(mode="json")


@mcp.tool
async def snooze_notification(
    notification_id: str, until: str, org_id: str | None = None
) -> dict[str, Any]:
    """Snooze one of the caller's notifications until a future ISO-8601 datetime.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notifications:write", org_id=org_id) as call:
        notification, actor_name = await notifications_service.snooze(
            call.session, call.ctx, uuid.UUID(notification_id), datetime.fromisoformat(until)
        )
        out = await notifications_service.serialize_one(call.session, notification, actor_name)
        return out.model_dump(mode="json")
