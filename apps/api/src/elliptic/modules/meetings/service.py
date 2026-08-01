"""Meeting business logic: CRUD, Folio import, transcripts, summarize, chat, share."""

import secrets
import uuid
from datetime import datetime

from pydantic import TypeAdapter
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from elliptic.core.pagination import PageParams
from elliptic.core.text import content_tokens, token_overlap
from elliptic.modules.activity.service import record_activity
from elliptic.modules.ai.models import AIRunPurpose
from elliptic.modules.ai.outputs import SummaryLineOutput, validate_llm_json
from elliptic.modules.ai.providers import ChatMessage
from elliptic.modules.ai.schemas import CoverageOut
from elliptic.modules.ai.service import run_completion
from elliptic.modules.meeting_templates.service import resolve_template_directive
from elliptic.modules.meetings.models import (
    Meeting,
    MeetingShare,
    MeetingSource,
    MeetingSummary,
    TranscriptSegment,
    meeting_attendees,
)
from elliptic.modules.meetings.schemas import (
    FolioImportIn,
    MeetingChatIn,
    MeetingCitationOut,
    MeetingCreateIn,
    MeetingUpdateIn,
    OrgMeetingChatIn,
    PublicChatIn,
    PublicMeetingShareOut,
    RecipeRunIn,
    SegmentOut,
    ShareCreateIn,
    ShareUpdateIn,
    SummarizeIn,
    TranscriptChapterOut,
)
from elliptic.modules.orgs.models import (
    ROLE_ORDER,
    Organization,
    OrganizationMember,
    OrgRole,
)
from elliptic.modules.projects.models import Project, ProjectMember
from elliptic.modules.projects.service import is_project_member
from elliptic.modules.users.models import User
from elliptic.modules.vocabulary.service import glossary_prompt

SUMMARIZE_SYSTEM_PROMPT = (
    "You are a meeting analyst. Each transcript line is prefixed with its segment id in "
    "brackets, like [<id>]. Produce a JSON array of summary lines covering decisions, action "
    'items, and highlights. Each element is {"text": "<one concise sentence>", "section": '
    '"<Decisions | Action items | Highlights, or a requested section name>", "segment_ids": '
    '["<id>", ...]} citing the segment ids that support it; use an empty array when a line has '
    "no clear source. Return ONLY the JSON array, no prose, no code fences. Be faithful to the "
    "transcript."
)
CHAT_SYSTEM_PROMPT = (
    "You answer questions about a meeting strictly from its transcript. If the transcript "
    "does not contain the answer, say so plainly."
)
RECIPE_SYSTEM_PROMPT = (
    "You run a saved instruction over a meeting transcript. Follow the user's instruction "
    "faithfully and stay grounded in the transcript; do not invent facts it does not contain."
)


_SUMMARY_LINES_ADAPTER = TypeAdapter(list[SummaryLineOutput])


def _parse_summary_lines(raw: str, valid_segment_ids: set[str]) -> list[dict[str, object]] | None:
    """Parse a model's JSON summary into source-anchored lines, or None if not structured.

    Segment ids the transcript does not actually contain are dropped, so an anchor
    never points at a fabricated source (MA-03 anti-hallucination guarantee).
    """
    items = validate_llm_json(_SUMMARY_LINES_ADAPTER, raw)
    if items is None:
        return None
    lines: list[dict[str, object]] = []
    for item in items:
        line_text = item.text.strip()
        if not line_text:
            continue
        segment_ids = [sid for sid in item.segment_ids if sid in valid_segment_ids]
        lines.append(
            {
                "text": line_text,
                "section": item.section.strip(),
                "provenance": "ai",
                "segment_ids": segment_ids,
            }
        )
    return lines or None


async def _structured_transcript(
    session: AsyncSession, meeting: Meeting, max_chars: int
) -> tuple[str, set[str]]:
    """Build a segment-id-annotated transcript plus the set of valid segment ids."""
    result = await session.scalars(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting.id)
        .order_by(TranscriptSegment.position)
    )
    segments = list(result)
    valid_ids = {str(segment.id) for segment in segments}
    if segments:
        transcript = "\n".join(
            f"[{segment.id}] {segment.speaker}: {segment.text}" for segment in segments
        )
    else:
        transcript = meeting.raw_markdown or ""
    if not transcript.strip():
        raise BadRequestError("Meeting has no transcript to work with")
    if len(transcript) > max_chars:
        transcript = transcript[:max_chars] + "\n[transcript truncated]"
    return transcript, valid_ids


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


async def _transcript_context(session: AsyncSession, meeting: Meeting, max_chars: int) -> str:
    result = await session.scalars(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting.id)
        .order_by(TranscriptSegment.position)
    )
    lines = [f"{segment.speaker}: {segment.text}" for segment in result]
    transcript = "\n".join(lines) if lines else (meeting.raw_markdown or "")
    if not transcript.strip():
        raise BadRequestError("Meeting has no transcript to work with")
    if len(transcript) > max_chars:
        transcript = transcript[:max_chars] + "\n[transcript truncated]"
    return transcript


async def summarize_meeting(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, payload: SummarizeIn
) -> MeetingSummary:
    """Summarize the transcript on the org's BYOK key and persist the summary."""
    meeting = await get_meeting(session, ctx, meeting_id)
    transcript, valid_ids = await _structured_transcript(
        session, meeting, get_settings().ai_max_context_chars
    )
    messages: list[ChatMessage] = [{"role": "system", "content": SUMMARIZE_SYSTEM_PROMPT}]
    glossary = await glossary_prompt(session, ctx.org.id)
    if glossary is not None:
        messages.append({"role": "system", "content": glossary})
    directive = await resolve_template_directive(session, ctx, payload.template_id)
    if directive is not None:
        messages.append({"role": "system", "content": directive})
    messages.append(
        {"role": "user", "content": f"Meeting: {meeting.title}\n\nTranscript:\n{transcript}"}
    )
    result, run = await run_completion(
        session,
        ctx,
        purpose=AIRunPurpose.SUMMARIZE,
        messages=messages,
        provider=payload.provider,
        model=payload.model,
        key_id=payload.key_id,
    )
    summary_lines = _parse_summary_lines(result.content, valid_ids)
    if payload.preserve_human:
        prior = await _latest_summary(session, meeting.id)
        if prior is not None and isinstance(prior.summary_lines, list):
            human = [
                line
                for line in prior.summary_lines
                if isinstance(line, dict) and line.get("provenance") == "human"
            ]
            if human:
                summary_lines = human + (summary_lines or [])
    content = (
        "\n".join(str(line["text"]) for line in summary_lines)
        if summary_lines is not None
        else result.content
    )
    summary = MeetingSummary(
        meeting_id=meeting.id,
        org_id=ctx.org.id,
        content=content,
        summary_lines=summary_lines,
        model=result.model,
        provider=run.provider,
        created_by=ctx.user.id,
        ai_run_id=run.id,
    )
    session.add(summary)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="summarized",
        actor_id=ctx.user.id,
        project_id=meeting.project_id,
        payload={"summary_id": str(summary.id), "model": result.model},
    )
    return summary


async def list_summaries(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID
) -> list[MeetingSummary]:
    """List summaries of a meeting, newest first."""
    meeting = await get_meeting(session, ctx, meeting_id)
    result = await session.scalars(
        select(MeetingSummary)
        .where(MeetingSummary.meeting_id == meeting.id)
        .order_by(MeetingSummary.created_at.desc())
    )
    return list(result)


async def chat_about_meeting(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, payload: MeetingChatIn
) -> tuple[str, str, uuid.UUID]:
    """Answer questions grounded on the transcript via the org key."""
    meeting = await get_meeting(session, ctx, meeting_id)
    transcript = await _transcript_context(session, meeting, get_settings().ai_max_context_chars)
    history: list[ChatMessage] = [
        {"role": message.role, "content": message.content} for message in payload.messages
    ]
    messages: list[ChatMessage] = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
        {
            "role": "system",
            "content": f"Meeting: {meeting.title}\n\nTranscript:\n{transcript}",
        },
    ]
    glossary = await glossary_prompt(session, ctx.org.id)
    if glossary is not None:
        messages.append({"role": "system", "content": glossary})
    messages.extend(history)
    result, run = await run_completion(
        session,
        ctx,
        purpose=AIRunPurpose.CHAT,
        messages=messages,
        provider=payload.provider,
        model=payload.model,
        key_id=payload.key_id,
    )
    return result.content, result.model, run.id


async def run_recipe(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, payload: RecipeRunIn
) -> tuple[str, str, uuid.UUID]:
    """Execute a saved/ad-hoc recipe prompt against a meeting's transcript."""
    meeting = await get_meeting(session, ctx, meeting_id)
    transcript = await _transcript_context(session, meeting, get_settings().ai_max_context_chars)
    messages: list[ChatMessage] = [
        {"role": "system", "content": RECIPE_SYSTEM_PROMPT},
        {"role": "system", "content": f"Meeting: {meeting.title}\n\nTranscript:\n{transcript}"},
    ]
    glossary = await glossary_prompt(session, ctx.org.id)
    if glossary is not None:
        messages.append({"role": "system", "content": glossary})
    messages.append({"role": "user", "content": payload.prompt})
    result, run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="recipe_run",
        actor_id=ctx.user.id,
        payload={"recipe_id": str(payload.recipe_id) if payload.recipe_id else None},
    )
    return result.content, result.model, run.id


ORG_CHAT_SYSTEM_PROMPT = (
    "You answer questions across multiple meetings using only the provided excerpts, each "
    "labelled with its meeting and segment id. Cite the meetings you draw on. If the excerpts "
    "do not contain the answer, say so plainly rather than guessing."
)
_RETRIEVAL_SCAN_CAP = 50
_RETRIEVAL_SHORTLIST = 6
_SEGMENTS_PER_MEETING = 3


async def retrieve_meetings(
    session: AsyncSession,
    ctx: OrgContext,
    query: str,
    *,
    project_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    pinned: list[uuid.UUID] | None = None,
) -> tuple[list[tuple[Meeting, list[TranscriptSegment]]], int]:
    """Shortlist org meetings relevant to a question (MA-11 retrieval pipeline).

    Respects project-membership visibility and the optional scope, ranks candidates
    by keyword overlap of the query against titles and transcript text, and returns
    each shortlisted meeting with its best-matching segments plus the total scanned.
    """
    pinned_ids = set(pinned or [])
    base = select(Meeting).where(Meeting.org_id == ctx.org.id)
    if not _is_org_admin(ctx):
        member_projects = select(ProjectMember.project_id).where(
            ProjectMember.org_id == ctx.org.id, ProjectMember.user_id == ctx.user.id
        )
        base = base.where(
            (Meeting.project_id.is_(None)) | (Meeting.project_id.in_(member_projects))
        )
    if project_id is not None:
        base = base.where(Meeting.project_id == project_id)
    if date_from is not None:
        base = base.where(Meeting.started_at >= date_from)
    if date_to is not None:
        base = base.where(Meeting.started_at <= date_to)
    meetings = list(
        await session.scalars(base.order_by(Meeting.started_at.desc()).limit(_RETRIEVAL_SCAN_CAP))
    )
    total = len(meetings)
    if not meetings:
        return [], 0
    meeting_ids = [meeting.id for meeting in meetings]
    segment_rows = await session.scalars(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id.in_(meeting_ids))
        .order_by(TranscriptSegment.position)
    )
    by_meeting: dict[uuid.UUID, list[TranscriptSegment]] = {}
    for segment in segment_rows:
        by_meeting.setdefault(segment.meeting_id, []).append(segment)
    query_tokens = content_tokens(query)
    scored: list[tuple[int, Meeting, list[TranscriptSegment]]] = []
    for meeting in meetings:
        segments = by_meeting.get(meeting.id, [])
        seg_scores = sorted(
            ((token_overlap(query_tokens, content_tokens(s.text)), s) for s in segments),
            key=lambda pair: pair[0],
            reverse=True,
        )
        title_score = token_overlap(query_tokens, content_tokens(meeting.title))
        meeting_score = title_score + sum(score for score, _ in seg_scores)
        is_pinned = meeting.id in pinned_ids
        if meeting_score == 0 and not is_pinned:
            continue
        top = [segment for score, segment in seg_scores if score > 0][:_SEGMENTS_PER_MEETING]
        if not top and segments:
            top = segments[:_SEGMENTS_PER_MEETING]
        rank = meeting_score + (10_000 if is_pinned else 0)
        scored.append((rank, meeting, top))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [(meeting, segments) for _, meeting, segments in scored[:_RETRIEVAL_SHORTLIST]], total


async def chat_across_org_meetings(
    session: AsyncSession, ctx: OrgContext, payload: OrgMeetingChatIn
) -> tuple[str, str, uuid.UUID, list[MeetingCitationOut], CoverageOut]:
    """Answer a question spanning the org's meetings, returning citations + coverage."""
    query = next(
        (m.content for m in reversed(payload.messages) if m.role == "user"),
        payload.messages[-1].content,
    )
    scope = payload.scope
    hits, total = await retrieve_meetings(
        session,
        ctx,
        query,
        project_id=scope.project_id if scope else None,
        date_from=scope.date_from if scope else None,
        date_to=scope.date_to if scope else None,
        pinned=scope.pinned if scope else None,
    )
    citations: list[MeetingCitationOut] = []
    blocks: list[str] = []
    for meeting, segments in hits:
        lines = [f"### {meeting.title} ({meeting.started_at.date().isoformat()})"]
        for segment in segments:
            lines.append(f"[{segment.id}] {segment.speaker}: {segment.text}")
            citations.append(
                MeetingCitationOut(
                    meeting_id=meeting.id,
                    meeting_title=meeting.title,
                    segment_id=segment.id,
                    start_seconds=segment.start_seconds,
                    quote=segment.text[:200],
                )
            )
        blocks.append("\n".join(lines))
    context = "\n\n".join(blocks)[: get_settings().ai_max_context_chars]
    messages: list[ChatMessage] = [{"role": "system", "content": ORG_CHAT_SYSTEM_PROMPT}]
    glossary = await glossary_prompt(session, ctx.org.id)
    if glossary is not None:
        messages.append({"role": "system", "content": glossary})
    messages.append(
        {
            "role": "system",
            "content": f"Meeting excerpts:\n{context}"
            if context
            else "No meeting excerpts matched.",
        }
    )
    messages.extend({"role": m.role, "content": m.content} for m in payload.messages)
    result, run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    coverage = CoverageOut(consulted=len(hits), total=total)
    return result.content, result.model, run.id, citations, coverage


def extract_action_items_decisions(
    summary: MeetingSummary | None,
) -> tuple[list[str], list[str]]:
    """Pull action items and decisions from a summary's sections, or markdown headings."""
    if summary is None:
        return [], []
    action_items: list[str] = []
    decisions: list[str] = []
    lines = summary.summary_lines
    if isinstance(lines, list) and lines:
        for line in lines:
            text = str(line.get("text", "")).strip()
            section = str(line.get("section", "")).lower()
            if not text:
                continue
            if "action" in section:
                action_items.append(text)
            elif "decision" in section:
                decisions.append(text)
        return action_items, decisions
    current: str | None = None
    for raw in summary.content.splitlines():
        stripped = raw.strip()
        heading = stripped.lstrip("#").strip().lower()
        if stripped.startswith("#"):
            current = (
                "action"
                if heading.startswith("action")
                else "decision"
                if heading.startswith("decision")
                else None
            )
            continue
        bullet = stripped.lstrip("-*").strip()
        if not bullet:
            continue
        if current == "action":
            action_items.append(bullet)
        elif current == "decision":
            decisions.append(bullet)
    return action_items, decisions


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


async def _latest_summary(session: AsyncSession, meeting_id: uuid.UUID) -> MeetingSummary | None:
    summary: MeetingSummary | None = await session.scalar(
        select(MeetingSummary)
        .where(MeetingSummary.meeting_id == meeting_id)
        .order_by(MeetingSummary.created_at.desc())
        .limit(1)
    )
    return summary


async def get_public_share(session: AsyncSession, token: str) -> PublicMeetingShareOut:
    """Build the unauthenticated guest view for a share token."""
    share = await _active_share(session, token)
    meeting = await session.get(Meeting, share.meeting_id)
    if meeting is None:
        raise NotFoundError("Shared meeting not found")
    summary = await _latest_summary(session, meeting.id)
    action_items, decisions = extract_action_items_decisions(summary)
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
        summary=summary.content if summary is not None else None,
        action_items=action_items,
        decisions=decisions,
        include_transcript=share.include_transcript,
        transcript=[SegmentOut.model_validate(segment) for segment in segments],
    )


async def _resolve_share_actor(session: AsyncSession, meeting: Meeting) -> OrgContext:
    """Resolve the org/key owner that a guest chat runs on behalf of."""
    org = await session.get(Organization, meeting.org_id)
    if org is None:
        raise NotFoundError("Shared meeting not found")
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == meeting.org_id,
            OrganizationMember.user_id == meeting.created_by,
        )
    )
    if member is None:
        member = await session.scalar(
            select(OrganizationMember)
            .where(OrganizationMember.org_id == meeting.org_id)
            .order_by(OrganizationMember.created_at)
            .limit(1)
        )
    if member is None:
        raise BadRequestError("This meeting cannot be queried")
    user = await session.get(User, member.user_id)
    if user is None:
        raise BadRequestError("This meeting cannot be queried")
    return OrgContext(org=org, member=member, user=user)


async def public_chat_about_meeting(
    session: AsyncSession, token: str, payload: PublicChatIn
) -> tuple[str, bool]:
    """Answer a guest question on the meeting owner's key, scoped to shared content."""
    share = await _active_share(session, token)
    meeting = await session.get(Meeting, share.meeting_id)
    if meeting is None:
        raise NotFoundError("Shared meeting not found")
    max_chars = get_settings().ai_max_context_chars
    context = ""
    grounded = False
    if share.include_transcript:
        rows = await session.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting.id)
            .order_by(TranscriptSegment.position)
        )
        segments = list(rows)
        if segments:
            context = "\n".join(f"{s.speaker}: {s.text}" for s in segments)[:max_chars]
            grounded = True
    if not context:
        summary = await _latest_summary(session, meeting.id)
        if summary is not None and summary.content.strip():
            context = summary.content[:max_chars]
            grounded = True
    if not context:
        return "There isn't enough shared context to answer that.", False
    ctx = await _resolve_share_actor(session, meeting)
    messages: list[ChatMessage] = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
        {"role": "system", "content": f"Meeting: {meeting.title}\n\n{context}"},
    ]
    messages.extend(
        {"role": message.role, "content": message.content} for message in payload.messages
    )
    result, _ = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    return result.content, grounded
