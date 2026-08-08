"""Activity feed read tools."""

import uuid
from typing import Any

from elliptic.core.pagination import PageParams
from elliptic.modules.activity import service as activity_service
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call


@mcp.tool
async def list_activity(
    limit: int = 50, offset: int = 0, org_id: str | None = None
) -> dict[str, Any]:
    """List the organization's recent activity feed, newest first.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("activity:read", org_id=org_id) as call:
        events, total = await activity_service.list_org_feed(
            call.session, call.ctx, PageParams(limit=limit, offset=offset)
        )
        return {
            "total": total,
            "items": [
                {
                    "id": str(event.id),
                    "entity_type": event.entity_type,
                    "entity_id": str(event.entity_id),
                    "event_type": event.event_type,
                    "project_id": str(event.project_id) if event.project_id else None,
                    "actor_id": str(event.actor_id) if event.actor_id else None,
                    "created_at": event.created_at.isoformat(),
                }
                for event in events
            ],
        }


@mcp.tool
async def get_entity_activity(
    entity_type: str,
    entity_id: str,
    limit: int = 50,
    offset: int = 0,
    org_id: str | None = None,
) -> dict[str, Any]:
    """List the activity timeline for one entity (e.g. task, note, project), newest first.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("activity:read", org_id=org_id) as call:
        events, total = await activity_service.list_entity_feed(
            call.session,
            call.ctx,
            entity_type,
            uuid.UUID(entity_id),
            PageParams(limit=limit, offset=offset),
        )
        return {
            "total": total,
            "items": [
                {
                    "id": str(event.id),
                    "entity_type": event.entity_type,
                    "entity_id": str(event.entity_id),
                    "event_type": event.event_type,
                    "project_id": str(event.project_id) if event.project_id else None,
                    "actor_id": str(event.actor_id) if event.actor_id else None,
                    "created_at": event.created_at.isoformat(),
                }
                for event in events
            ],
        }
