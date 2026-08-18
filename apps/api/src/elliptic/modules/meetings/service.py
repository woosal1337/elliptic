"""Meeting business logic: CRUD, Folio import, transcripts, summarize, chat, share."""

import secrets
import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.service import record_activity
from elliptic.modules.meetings.models import (
    Meeting,
    MeetingShare,
    MeetingSource,
    TranscriptSegment,
    meeting_attendees,
)
from elliptic.modules.meetings.schemas import (
    FolioImportIn,
    MeetingCreateIn,
    MeetingUpdateIn,
    PublicMeetingShareOut,
    SegmentOut,
    ShareCreateIn,
    ShareUpdateIn,
    TranscriptChapterOut,
)
from elliptic.modules.orgs.models import (
    ROLE_ORDER,
    OrganizationMember,
    OrgRole,
)
from elliptic.modules.projects.models import Project, ProjectMember
from elliptic.modules.projects.service import is_project_member

SUMMARIZE_SYSTEM_PROMPT = (
    "You are a meeting analyst. Each transcript line is prefixed with its segment id in "
    "brackets, like [<id>]. Produce a JSON array of summary lines covering decisions, action "
    'items, and highlights. Each element is {"text": "<one concise sentence>", "section": '
    '"<Decisions | Action items | Highlights, or a requested section name>", "segment_ids": '
    '["<id>", ...]} citing the segment ids that support it; use an empty array when a line has '
    "no clear source. Return ONLY the JSON array, no prose, no code fences. Be faithful to the "
    "transcript."
)


async def _validate_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise BadRequestError("Project not found in this organization")


def _is_org_admin(ctx: OrgContext) -> bool:
    return ROLE_ORDER[ctx.role] >= ROLE_ORDER[OrgRole.ADMIN]


async def _require_project_attach(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> None:
    await _validate_project(session, ctx, project_id)
    if _is_org_admin(ctx):
        return
    if not await is_project_member(session, ctx, project_id, ctx.user.id):
        raise ForbiddenError("You must be a member of this project to attach a meeting to it")


async def _require_meeting_access(session: AsyncSession, ctx: OrgContext, meeting: Meeting) -> None:
    if meeting.project_id is None or _is_org_admin(ctx):
        return
    if not await is_project_member(session, ctx, meeting.project_id, ctx.user.id):
        raise NotFoundError("Meeting not found")


def _require_meeting_write(ctx: OrgContext, meeting: Meeting) -> None:
    if meeting.created_by == ctx.user.id or _is_org_admin(ctx):
        return
    raise ForbiddenError("Only the meeting creator or an org admin can modify this meeting")


async def _validate_attendees(
    session: AsyncSession, ctx: OrgContext, attendee_ids: list[uuid.UUID]
) -> None:
    if not attendee_ids:
        return
    result = await session.scalars(
        select(OrganizationMember.user_id).where(
            OrganizationMember.org_id == ctx.org.id,
            OrganizationMember.user_id.in_(attendee_ids),
        )
    )
    if len(set(result)) != len(set(attendee_ids)):
        raise BadRequestError("All attendees must be members of this organization")


async def _set_attendees(
    session: AsyncSession, meeting_id: uuid.UUID, attendee_ids: list[uuid.UUID]
) -> None:
    await session.execute(
        delete(meeting_attendees).where(meeting_attendees.c.meeting_id == meeting_id)
    )
    for user_id in dict.fromkeys(attendee_ids):
        await session.execute(
            meeting_attendees.insert().values(meeting_id=meeting_id, user_id=user_id)
        )


async def get_meeting(session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID) -> Meeting:
    """Fetch a meeting within the org, enforcing project-membership scoping, or 404."""
    meeting = await session.scalar(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.org_id == ctx.org.id)
    )
    if meeting is None:
        raise NotFoundError("Meeting not found")
    await _require_meeting_access(session, ctx, meeting)
    return meeting


async def create_meeting(
    session: AsyncSession, ctx: OrgContext, payload: MeetingCreateIn
) -> Meeting:
    """Create a meeting manually."""
    if payload.project_id is not None:
        await _require_project_attach(session, ctx, payload.project_id)
    await _validate_attendees(session, ctx, payload.attendee_ids)
    meeting = Meeting(
        org_id=ctx.org.id,
        project_id=payload.project_id,
        title=payload.title,
        started_at=payload.started_at,
        duration_seconds=payload.duration_seconds,
        source=MeetingSource.MANUAL,
        external_attendees=payload.external_attendees,
        raw_markdown=payload.raw_markdown,
        created_by=ctx.user.id,
    )
    session.add(meeting)
    await session.flush()
    await _set_attendees(session, meeting.id, payload.attendee_ids)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="created",
        actor_id=ctx.user.id,
        project_id=meeting.project_id,
        payload={"title": meeting.title},
    )
    return meeting


async def list_meetings(
    session: AsyncSession, ctx: OrgContext, page: PageParams
) -> tuple[list[Meeting], int]:
    """List meetings the caller may see in the org, newest first."""
    base = select(Meeting).where(Meeting.org_id == ctx.org.id)
    if not _is_org_admin(ctx):
        member_projects = select(ProjectMember.project_id).where(
            ProjectMember.org_id == ctx.org.id, ProjectMember.user_id == ctx.user.id
        )
        base = base.where(
            (Meeting.project_id.is_(None)) | (Meeting.project_id.in_(member_projects))
        )
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(Meeting.started_at.desc()).limit(page.limit).offset(page.offset)
    )
    return list(result), total


async def update_meeting(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, payload: MeetingUpdateIn
) -> Meeting:
    """Apply updates to a meeting."""
    meeting = await get_meeting(session, ctx, meeting_id)
    _require_meeting_write(ctx, meeting)
    if payload.project_id is not None:
        await _require_project_attach(session, ctx, payload.project_id)
        meeting.project_id = payload.project_id
    if payload.title is not None:
        meeting.title = payload.title
    if payload.started_at is not None:
        meeting.started_at = payload.started_at
    if payload.duration_seconds is not None:
        meeting.duration_seconds = payload.duration_seconds
    if payload.external_attendees is not None:
        meeting.external_attendees = payload.external_attendees
    if payload.raw_markdown is not None:
        meeting.raw_markdown = payload.raw_markdown
    if payload.attendee_ids is not None:
        await _validate_attendees(session, ctx, payload.attendee_ids)
        await _set_attendees(session, meeting.id, payload.attendee_ids)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="updated",
        actor_id=ctx.user.id,
        project_id=meeting.project_id,
    )
    await session.flush()
    return meeting


async def delete_meeting(session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID) -> None:
    """Delete a meeting and its transcript."""
    meeting = await get_meeting(session, ctx, meeting_id)
    _require_meeting_write(ctx, meeting)
    await session.delete(meeting)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        project_id=meeting.project_id,
        payload={"title": meeting.title},
    )
    await session.flush()


async def import_folio(session: AsyncSession, ctx: OrgContext, payload: FolioImportIn) -> Meeting:
    """Create a meeting and its transcript segments atomically from a Folio export."""
    if payload.project_id is not None:
        await _require_project_attach(session, ctx, payload.project_id)
    meeting = Meeting(
        org_id=ctx.org.id,
        project_id=payload.project_id,
        title=payload.title,
        started_at=payload.started_at,
        duration_seconds=payload.duration_seconds,
        source=MeetingSource.FOLIO,
        external_attendees=payload.attendees,
        raw_markdown=payload.markdown,
        created_by=ctx.user.id,
    )
    session.add(meeting)
    await session.flush()
    session.add_all(
        TranscriptSegment(
            meeting_id=meeting.id,
            org_id=ctx.org.id,
            speaker=segment.speaker,
            start_seconds=segment.start_seconds,
            end_seconds=segment.end_seconds,
            text=segment.text,
            position=position,
        )
        for position, segment in enumerate(payload.segments)
    )
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="imported",
        actor_id=ctx.user.id,
        payload={"title": meeting.title, "segments": len(payload.segments)},
    )
    await session.flush()
    return meeting


_MIN_SEGMENTS_FOR_CHAPTERS = 6
_MAX_CHAPTERS = 8
_CHAPTER_LABEL_WORDS = 7


def compute_chapters(segments: list[TranscriptSegment]) -> list[TranscriptChapterOut]:
    """Derive 2-8 labelled topic jump points from a transcript (MA-07)."""
    if len(segments) < _MIN_SEGMENTS_FOR_CHAPTERS:
        return []
    target = min(_MAX_CHAPTERS, max(2, len(segments) // 4))
    chunk = (len(segments) + target - 1) // target
    chapters: list[TranscriptChapterOut] = []
    for index in range(0, len(segments), chunk):
        first = segments[index]
        words = first.text.split()[:_CHAPTER_LABEL_WORDS]
        label = " ".join(words) if words else f"Part {len(chapters) + 1}"
        chapters.append(
            TranscriptChapterOut(
                label=label, start_seconds=first.start_seconds, segment_id=first.id
            )
        )
    return chapters


async def list_chapters(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID
) -> list[TranscriptChapterOut]:
    """Return the meeting's transcript chapters, computed from its segments."""
    meeting = await get_meeting(session, ctx, meeting_id)
    segments = list(
        await session.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting.id)
            .order_by(TranscriptSegment.position)
        )
    )
    return compute_chapters(segments)


async def list_segments(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, page: PageParams
) -> tuple[list[TranscriptSegment], int]:
    """List transcript segments of a meeting in order, paged."""
    meeting = await get_meeting(session, ctx, meeting_id)
    base = select(TranscriptSegment).where(TranscriptSegment.meeting_id == meeting.id)
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(TranscriptSegment.position).limit(page.limit).offset(page.offset)
    )
    return list(result), total


ORG__RETRIEVAL_SCAN_CAP = 50
_RETRIEVAL_SHORTLIST = 6
_SEGMENTS_PER_MEETING = 3


async def get_meeting_share(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID
) -> MeetingShare | None:
    """Return the meeting's share record, or None."""
    meeting = await get_meeting(session, ctx, meeting_id)
    share: MeetingShare | None = await session.scalar(
        select(MeetingShare).where(MeetingShare.meeting_id == meeting.id)
    )
    return share


async def create_meeting_share(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, payload: ShareCreateIn
) -> MeetingShare:
    """Mint (or re-enable) a public share for a meeting. Creator/admin only."""
    meeting = await get_meeting(session, ctx, meeting_id)
    _require_meeting_write(ctx, meeting)
    existing = await session.scalar(
        select(MeetingShare).where(MeetingShare.meeting_id == meeting.id)
    )
    if existing is not None:
        existing.include_transcript = payload.include_transcript
        existing.revoked = False
        await session.flush()
        return existing
    share = MeetingShare(
        org_id=ctx.org.id,
        meeting_id=meeting.id,
        token=secrets.token_urlsafe(24),
        include_transcript=payload.include_transcript,
        created_by=ctx.user.id,
    )
    session.add(share)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="shared",
        actor_id=ctx.user.id,
        payload={"include_transcript": payload.include_transcript},
    )
    return share


async def update_meeting_share(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, payload: ShareUpdateIn
) -> MeetingShare:
    """Toggle transcript inclusion or revoke a share. Creator/admin only."""
    meeting = await get_meeting(session, ctx, meeting_id)
    _require_meeting_write(ctx, meeting)
    share = await session.scalar(select(MeetingShare).where(MeetingShare.meeting_id == meeting.id))
    if share is None:
        raise NotFoundError("Share not found")
    if payload.include_transcript is not None:
        share.include_transcript = payload.include_transcript
    if payload.revoked is not None:
        share.revoked = payload.revoked
        if payload.revoked:
            await record_activity(
                session,
                org_id=ctx.org.id,
                entity_type="meeting",
                entity_id=meeting.id,
                event_type="share_revoked",
                actor_id=ctx.user.id,
            )
    await session.flush()
    return share


async def _active_share(session: AsyncSession, token: str) -> MeetingShare:
    share = await session.scalar(select(MeetingShare).where(MeetingShare.token == token))
    if share is None or share.revoked:
        raise NotFoundError("Shared meeting not found")
    return share


async def get_public_share(session: AsyncSession, token: str) -> PublicMeetingShareOut:
    """The unauthenticated guest view for a share token: the transcript, if the
    share includes it. There is no summary to show — summaries were AI-generated
    and went with the assistant."""
    share = await _active_share(session, token)
    meeting = await session.get(Meeting, share.meeting_id)
    if meeting is None:
        raise NotFoundError("Shared meeting not found")
    segments: list[TranscriptSegment] = []
    if share.include_transcript:
        rows = await session.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting.id)
            .order_by(TranscriptSegment.position)
        )
        segments = list(rows)
    return PublicMeetingShareOut(
        meeting_title=meeting.title,
        include_transcript=share.include_transcript,
        transcript=[SegmentOut.model_validate(segment) for segment in segments],
    )
