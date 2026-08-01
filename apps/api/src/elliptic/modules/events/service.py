"""Calendar event business logic."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.core.text import content_tokens, token_overlap
from elliptic.modules.activity.service import record_activity
from elliptic.modules.events.models import Event
from elliptic.modules.events.schemas import (
    EventCreateIn,
    EventOut,
    EventScopeFilter,
    EventUpdateIn,
    EventVisibility,
    MeetingBriefBulletOut,
    MeetingBriefOut,
)
from elliptic.modules.meetings.models import Meeting, MeetingSummary
from elliptic.modules.meetings.service import extract_action_items_decisions
from elliptic.modules.notes.models import Note
from elliptic.modules.orgs.models import ROLE_ORDER, OrgRole
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task, TaskStatus

_OPEN_TASK_LIMIT = 3
_BRIEF_BULLET_CAP = 5
_BRIEF_CLOSED_STATUSES = (TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.DUPLICATE)


def _to_utc(value: datetime) -> datetime:
    """Coerce a datetime to timezone-aware UTC, assuming UTC when naive."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def event_to_out(event: Event, linked_notes_count: int = 0) -> EventOut:
    """Serialize an event, deriving its team/personal scope from ownership."""
    scope: EventVisibility = "personal" if event.owner_id is not None else "team"
    return EventOut.model_validate(
        {
            "id": event.id,
            "org_id": event.org_id,
            "owner_id": event.owner_id,
            "scope": scope,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "starts_at": event.starts_at,
            "ends_at": event.ends_at,
            "all_day": event.all_day,
            "meeting_id": event.meeting_id,
            "linked_meeting_id": event.meeting_id,
            "linked_notes_count": linked_notes_count,
            "created_by": event.created_by,
            "created_at": event.created_at,
            "updated_at": event.updated_at,
        }
    )


async def linked_notes_counts(session: AsyncSession, events: list[Event]) -> dict[uuid.UUID, int]:
    """Count notes sharing each event's linked-meeting project (CAL-02-BE)."""
    meeting_ids = {event.meeting_id for event in events if event.meeting_id is not None}
    if not meeting_ids:
        return {}
    meeting_rows = await session.execute(
        select(Meeting.id, Meeting.project_id).where(Meeting.id.in_(meeting_ids))
    )
    meeting_project = {mid: pid for mid, pid in meeting_rows if pid is not None}
    if not meeting_project:
        return {}
    note_rows = await session.execute(
        select(Note.project_id, func.count())
        .where(Note.project_id.in_(set(meeting_project.values())))
        .group_by(Note.project_id)
    )
    project_counts: dict[uuid.UUID, int] = {row[0]: row[1] for row in note_rows}
    return {
        event.id: project_counts.get(meeting_project[event.meeting_id], 0)
        for event in events
        if event.meeting_id is not None and event.meeting_id in meeting_project
    }


async def _validate_meeting(session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID) -> None:
    meeting = await session.scalar(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.org_id == ctx.org.id)
    )
    if meeting is None:
        raise BadRequestError("Meeting not found in this organization")


async def get_event(session: AsyncSession, ctx: OrgContext, event_id: uuid.UUID) -> Event:
    """Fetch an event the caller may see within the org, or 404.

    A team event (NULL owner) is visible to any org member; a personal event is
    visible only to its owner. Another user's personal event is reported as 404.
    """
    event = await session.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.org_id == ctx.org.id,
            or_(Event.owner_id.is_(None), Event.owner_id == ctx.user.id),
        )
    )
    if event is None:
        raise NotFoundError("Event not found")
    return event


async def create_event(session: AsyncSession, ctx: OrgContext, payload: EventCreateIn) -> Event:
    """Create a team or personal calendar event in the organization."""
    starts_at = _to_utc(payload.starts_at)
    ends_at = _to_utc(payload.ends_at)
    if ends_at < starts_at:
        raise BadRequestError("ends_at must not be before starts_at")
    if payload.meeting_id is not None:
        await _validate_meeting(session, ctx, payload.meeting_id)
    owner_id = ctx.user.id if payload.visibility == "personal" else None
    event = Event(
        org_id=ctx.org.id,
        owner_id=owner_id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        starts_at=starts_at,
        ends_at=ends_at,
        all_day=payload.all_day,
        meeting_id=payload.meeting_id,
        created_by=ctx.user.id,
    )
    session.add(event)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="event",
        entity_id=event.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"title": event.title, "scope": payload.visibility},
    )
    return event


async def list_events(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    from_dt: datetime,
    to_dt: datetime,
    scope: EventScopeFilter = "all",
) -> list[Event]:
    """List events overlapping [from_dt, to_dt], scoped to the caller.

    Returns team events (NULL owner) and the caller's own personal events.
    Another user's personal events are never returned. The ``scope`` argument
    narrows the result to only team or only personal events.
    """
    from_dt = _to_utc(from_dt)
    to_dt = _to_utc(to_dt)
    if to_dt < from_dt:
        raise BadRequestError("to must not be before from")
    query = select(Event).where(
        Event.org_id == ctx.org.id,
        Event.starts_at <= to_dt,
        Event.ends_at >= from_dt,
    )
    if scope == "team":
        query = query.where(Event.owner_id.is_(None))
    elif scope == "personal":
        query = query.where(Event.owner_id == ctx.user.id)
    else:
        query = query.where(or_(Event.owner_id.is_(None), Event.owner_id == ctx.user.id))
    result = await session.scalars(query.order_by(Event.starts_at, Event.id))
    return list(result)


def _is_admin(ctx: OrgContext) -> bool:
    return ROLE_ORDER[ctx.role] >= ROLE_ORDER[OrgRole.ADMIN]


def _assert_can_mutate(event: Event, ctx: OrgContext) -> None:
    if event.owner_id is not None:
        if event.owner_id != ctx.user.id:
            raise ForbiddenError("Only the owner can modify a personal event")
        return
    if event.created_by != ctx.user.id and not _is_admin(ctx):
        raise ForbiddenError("Only the creator or an admin can modify a team event")


async def update_event(
    session: AsyncSession, ctx: OrgContext, event_id: uuid.UUID, payload: EventUpdateIn
) -> Event:
    """Apply updates to a team or personal event the caller may modify."""
    event = await get_event(session, ctx, event_id)
    _assert_can_mutate(event, ctx)
    if payload.title is not None:
        event.title = payload.title
    if payload.description is not None:
        event.description = payload.description
    if payload.location is not None:
        event.location = payload.location
    if payload.starts_at is not None:
        event.starts_at = _to_utc(payload.starts_at)
    if payload.ends_at is not None:
        event.ends_at = _to_utc(payload.ends_at)
    if payload.all_day is not None:
        event.all_day = payload.all_day
    if payload.meeting_id is not None:
        await _validate_meeting(session, ctx, payload.meeting_id)
        event.meeting_id = payload.meeting_id
    if payload.visibility is not None:
        event.owner_id = event.created_by if payload.visibility == "personal" else None
    if event.ends_at < event.starts_at:
        raise BadRequestError("ends_at must not be before starts_at")
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="event",
        entity_id=event.id,
        event_type="updated",
        actor_id=ctx.user.id,
    )
    await session.flush()
    return event


async def generate_event_brief(
    session: AsyncSession, ctx: OrgContext, event_id: uuid.UUID
) -> MeetingBriefOut:
    """Build a 2-3 bullet pre-meeting brief from existing data (CAL-03).

    Honest about thin context per MA-13: pulls only real, sourced facts (the
    owner's open tasks, the linked meeting's action items, a related note) and
    returns no filler — an empty brief with zero confidence when nothing is found.
    """
    event = await get_event(session, ctx, event_id)
    person_id = event.owner_id or event.created_by
    bullets: list[MeetingBriefBulletOut] = []

    task_rows = await session.execute(
        select(Task, Project.key)
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.org_id == ctx.org.id,
            Task.assignee_id == person_id,
            Task.is_triage.is_(False),
            Task.archived_at.is_(None),
            Task.status.notin_(_BRIEF_CLOSED_STATUSES),
        )
        .order_by(Task.updated_at.desc())
        .limit(_OPEN_TASK_LIMIT)
    )
    for task, key in task_rows:
        bullets.append(
            MeetingBriefBulletOut(
                text=f"Open task: {task.title}",
                source_kind="task",
                source_id=task.id,
                source_label=f"{key}-{task.number}",
            )
        )

    if event.meeting_id is not None:
        meeting = await session.get(Meeting, event.meeting_id)
        summary = await session.scalar(
            select(MeetingSummary)
            .where(MeetingSummary.meeting_id == event.meeting_id)
            .order_by(MeetingSummary.created_at.desc())
            .limit(1)
        )
        action_items, _ = extract_action_items_decisions(summary)
        label = meeting.title if meeting is not None else "Linked meeting"
        bullets.extend(
            MeetingBriefBulletOut(
                text=f"Follow-up from last time: {item}",
                source_kind="meeting",
                source_id=event.meeting_id,
                source_label=label,
            )
            for item in action_items[:2]
        )

    event_tokens = content_tokens(event.title, event.description)
    if event_tokens:
        notes = list(await session.scalars(select(Note).where(Note.org_id == ctx.org.id)))
        best_note: Note | None = None
        best_score = 0
        for note in notes:
            score = token_overlap(event_tokens, content_tokens(note.title, note.content))
            if score > best_score:
                best_score = score
                best_note = note
        if best_note is not None:
            bullets.append(
                MeetingBriefBulletOut(
                    text=f"Related note: {best_note.title}",
                    source_kind="note",
                    source_id=best_note.id,
                    source_label=best_note.title[:60],
                )
            )

    capped = bullets[:_BRIEF_BULLET_CAP]
    confidence = round(min(1.0, 0.3 * len(capped)), 2) if capped else 0.0
    return MeetingBriefOut(bullets=capped, confidence=confidence, generated_at=utcnow())


async def delete_event(session: AsyncSession, ctx: OrgContext, event_id: uuid.UUID) -> None:
    """Delete a team or personal event the caller may modify."""
    event = await get_event(session, ctx, event_id)
    _assert_can_mutate(event, ctx)
    title = event.title
    await session.delete(event)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="event",
        entity_id=event_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"title": title},
    )
    await session.flush()
