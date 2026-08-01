"""Calendar event endpoints."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.events import service
from elliptic.modules.events.schemas import (
    EventCreateIn,
    EventOut,
    EventScopeFilter,
    EventUpdateIn,
    MeetingBriefOut,
)
from elliptic.modules.events.service import event_to_out

router = APIRouter(prefix="/orgs/{org_id}/events", tags=["events"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[EventOut]:
    event = await service.create_event(session, ctx, payload)
    return ok(event_to_out(event), message="Event created")


@router.get("")
async def list_events(
    ctx: OrgCtx,
    session: SessionDep,
    from_dt: Annotated[datetime, Query(alias="from")],
    to_dt: Annotated[datetime, Query(alias="to")],
    scope: Annotated[EventScopeFilter, Query()] = "all",
) -> SuccessResponse[list[EventOut]]:
    events = await service.list_events(session, ctx, from_dt=from_dt, to_dt=to_dt, scope=scope)
    counts = await service.linked_notes_counts(session, events)
    return ok([event_to_out(event, counts.get(event.id, 0)) for event in events])


@router.get("/{event_id}")
async def get_event(
    event_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[EventOut]:
    event = await service.get_event(session, ctx, event_id)
    counts = await service.linked_notes_counts(session, [event])
    return ok(event_to_out(event, counts.get(event.id, 0)))


@router.get("/{event_id}/brief")
async def event_brief(
    event_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingBriefOut]:
    brief = await service.generate_event_brief(session, ctx, event_id)
    return ok(brief)


@router.patch("/{event_id}")
async def update_event(
    event_id: uuid.UUID, payload: EventUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[EventOut]:
    event = await service.update_event(session, ctx, event_id, payload)
    return ok(event_to_out(event), message="Event updated")


@router.delete("/{event_id}")
async def delete_event(
    event_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_event(session, ctx, event_id)
    return ok(None, message="Event deleted")
