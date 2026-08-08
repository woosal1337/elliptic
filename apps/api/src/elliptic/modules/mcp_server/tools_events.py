"""Calendar event read/write tools."""

import uuid
from datetime import datetime
from typing import Any, Literal

from elliptic.modules.events import service as events_service
from elliptic.modules.events.schemas import EventCreateIn, EventUpdateIn
from elliptic.modules.events.service import event_to_out
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call


@mcp.tool
async def list_calendar_events(
    from_date: str,
    to_date: str,
    scope: Literal["all", "team", "personal"] = "all",
    org_id: str | None = None,
) -> dict[str, Any]:
    """List calendar events in a window. from_date/to_date are ISO-8601 timestamps.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("events:read", org_id=org_id) as call:
        events = await events_service.list_events(
            call.session,
            call.ctx,
            from_dt=datetime.fromisoformat(from_date),
            to_dt=datetime.fromisoformat(to_date),
            scope=scope,
        )
        counts = await events_service.linked_notes_counts(call.session, events)
        return {
            "items": [
                event_to_out(event, counts.get(event.id, 0)).model_dump(mode="json")
                for event in events
            ]
        }


@mcp.tool
async def get_calendar_event(event_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one calendar event.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("events:read", org_id=org_id) as call:
        event = await events_service.get_event(call.session, call.ctx, uuid.UUID(event_id))
        return event_to_out(event).model_dump(mode="json")


@mcp.tool
async def get_event_brief(event_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Generate a 2-3 bullet pre-meeting brief for a calendar event from existing data.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("events:read", org_id=org_id) as call:
        brief = await events_service.generate_event_brief(
            call.session, call.ctx, uuid.UUID(event_id)
        )
        return brief.model_dump(mode="json")


@mcp.tool
async def create_calendar_event(
    title: str,
    starts_at: str,
    ends_at: str,
    description: str | None = None,
    location: str | None = None,
    all_day: bool = False,
    visibility: Literal["team", "personal"] = "team",
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a team or personal calendar event. starts_at/ends_at are ISO-8601.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("events:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = EventCreateIn(
                title=title,
                description=description,
                location=location,
                starts_at=datetime.fromisoformat(starts_at),
                ends_at=datetime.fromisoformat(ends_at),
                all_day=all_day,
                visibility=visibility,
            )
            event = await events_service.create_event(call.session, call.ctx, payload)
            return event_to_out(event).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_calendar_event",
            producer=_produce,
        )


@mcp.tool
async def update_calendar_event(
    event_id: str,
    title: str | None = None,
    description: str | None = None,
    location: str | None = None,
    starts_at: str | None = None,
    ends_at: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Edit a calendar event.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("events:write", org_id=org_id) as call:
        payload = EventUpdateIn(
            title=title,
            description=description,
            location=location,
            starts_at=datetime.fromisoformat(starts_at) if starts_at else None,
            ends_at=datetime.fromisoformat(ends_at) if ends_at else None,
        )
        event = await events_service.update_event(
            call.session, call.ctx, uuid.UUID(event_id), payload
        )
        return event_to_out(event).model_dump(mode="json")


@mcp.tool
async def delete_calendar_event(event_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Delete a calendar event.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("events:write", org_id=org_id) as call:
        await events_service.delete_event(call.session, call.ctx, uuid.UUID(event_id))
        return {"deleted": True, "event_id": event_id}
