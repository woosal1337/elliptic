"""Server-sent events stream that pushes live activity to web clients."""

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from elliptic.core.database import session_factory
from elliptic.core.deps import get_current_user, get_org_context
from elliptic.core.realtime import broker

router = APIRouter(tags=["stream"])


@router.get("/orgs/{org_id}/stream")
async def stream_activity(org_id: uuid.UUID, request: Request) -> EventSourceResponse:
    """Stream the organization's activity events to the caller over SSE."""
    async with session_factory() as session:
        user = await get_current_user(request, session)
        ctx = await get_org_context(org_id, user, session)
    resolved_org_id = ctx.org.id

    async def event_source() -> AsyncIterator[dict[str, Any]]:
        queue = broker.subscribe(resolved_org_id)
        try:
            while True:
                event = await queue.get()
                yield {"event": "activity", "data": json.dumps(event)}
        finally:
            broker.unsubscribe(resolved_org_id, queue)

    return EventSourceResponse(event_source())
