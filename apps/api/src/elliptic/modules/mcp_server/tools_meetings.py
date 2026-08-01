"""Meeting read, import, and edit tools (Folio-native)."""

import uuid
from datetime import datetime
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.core.pagination import PageParams
from elliptic.modules.ai import insight
from elliptic.modules.ai.schemas import RouteSuggestionOut
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.meetings import service as meetings_service
from elliptic.modules.meetings.schemas import (
    ChatMessageIn,
    FolioImportIn,
    MeetingChatIn,
    MeetingCreateIn,
    MeetingOut,
    MeetingShareOut,
    MeetingUpdateIn,
    OrgChatScopeIn,
    OrgMeetingChatIn,
    OrgMeetingChatOut,
    RecipeRunIn,
    SegmentOut,
    ShareCreateIn,
    ShareUpdateIn,
    SummarizeIn,
    SummaryOut,
    TranscriptChapterOut,
)


@mcp.tool
async def list_meetings(
    limit: int = 50, offset: int = 0, org_id: str | None = None
) -> dict[str, Any]:
    """List the organization's meetings, newest first.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        meetings, total = await meetings_service.list_meetings(
            call.session, call.ctx, PageParams(limit=limit, offset=offset)
        )
        items = [MeetingOut.model_validate(meeting).model_dump(mode="json") for meeting in meetings]
        return {"total": total, "items": items}


@mcp.tool
async def get_meeting(meeting_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one meeting's metadata.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        meeting = await meetings_service.get_meeting(call.session, call.ctx, uuid.UUID(meeting_id))
        return MeetingOut.model_validate(meeting).model_dump(mode="json")


@mcp.tool
async def create_meeting(
    title: str,
    started_at: str,
    duration_seconds: int | None = None,
    project_id: str | None = None,
    attendee_ids: list[str] | None = None,
    external_attendees: list[str] | None = None,
    raw_markdown: str | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a meeting manually (started_at is ISO-8601; attendees are org member ids).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = MeetingCreateIn(
                title=title,
                started_at=datetime.fromisoformat(started_at),
                duration_seconds=duration_seconds,
                project_id=uuid.UUID(project_id) if project_id else None,
                attendee_ids=[uuid.UUID(value) for value in (attendee_ids or [])],
                external_attendees=external_attendees or [],
                raw_markdown=raw_markdown,
            )
            meeting = await meetings_service.create_meeting(call.session, call.ctx, payload)
            return MeetingOut.model_validate(meeting).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_meeting",
            producer=_produce,
        )


@mcp.tool
async def import_folio_meeting(
    folio: dict[str, Any], idempotency_key: str | None = None, org_id: str | None = None
) -> dict[str, Any]:
    """Import a Folio recorder export.

    folio = {title, started_at, duration_seconds?, attendees?, segments:[{speaker,
    start_seconds, end_seconds, text}], markdown?, project_id?}

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = FolioImportIn.model_validate(folio)
            meeting = await meetings_service.import_folio(call.session, call.ctx, payload)
            return MeetingOut.model_validate(meeting).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="import_folio_meeting",
            producer=_produce,
        )


@mcp.tool
async def update_meeting(
    meeting_id: str,
    title: str | None = None,
    project_id: str | None = None,
    raw_markdown: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Edit a meeting's title, attached project, or markdown.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = MeetingUpdateIn(
            title=title,
            project_id=uuid.UUID(project_id) if project_id else None,
            raw_markdown=raw_markdown,
        )
        meeting = await meetings_service.update_meeting(
            call.session, call.ctx, uuid.UUID(meeting_id), payload
        )
        return MeetingOut.model_validate(meeting).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_meeting(
    meeting_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a meeting and its transcript. Preview unless confirm=true.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        meeting = await meetings_service.get_meeting(call.session, call.ctx, uuid.UUID(meeting_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_meeting",
                "title": meeting.title,
                "hint": "Re-call delete_meeting with confirm=true to permanently delete.",
            }
        await meetings_service.delete_meeting(call.session, call.ctx, uuid.UUID(meeting_id))
        return {"deleted": True, "meeting_id": meeting_id}


@mcp.tool
async def list_meeting_segments(
    meeting_id: str, limit: int = 200, offset: int = 0, org_id: str | None = None
) -> dict[str, Any]:
    """List a meeting's transcript segments in order.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        segments, total = await meetings_service.list_segments(
            call.session, call.ctx, uuid.UUID(meeting_id), PageParams(limit=limit, offset=offset)
        )
        items = [SegmentOut.model_validate(segment).model_dump(mode="json") for segment in segments]
        return {"total": total, "items": items}


@mcp.tool
async def list_meeting_summaries(meeting_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List a meeting's generated summaries, newest first.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        summaries = await meetings_service.list_summaries(
            call.session, call.ctx, uuid.UUID(meeting_id)
        )
        return {
            "items": [
                SummaryOut.model_validate(summary).model_dump(mode="json") for summary in summaries
            ]
        }


@mcp.tool
async def summarize_meeting(
    meeting_id: str,
    template_id: str | None = None,
    preserve_human: bool = False,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Generate a segment-cited summary of a meeting on the org's BYOK key.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = SummarizeIn(template_id=template_id, preserve_human=preserve_human)
        summary = await meetings_service.summarize_meeting(
            call.session, call.ctx, uuid.UUID(meeting_id), payload
        )
        return SummaryOut.model_validate(summary).model_dump(mode="json")


@mcp.tool
async def ask_meeting(meeting_id: str, question: str, org_id: str | None = None) -> dict[str, Any]:
    """Ask a question grounded in one meeting's transcript (on the org's BYOK key).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        payload = MeetingChatIn(messages=[ChatMessageIn(role="user", content=question)])
        reply, model, ai_run_id = await meetings_service.chat_about_meeting(
            call.session, call.ctx, uuid.UUID(meeting_id), payload
        )
        return {"reply": reply, "model": model, "ai_run_id": str(ai_run_id)}


@mcp.tool
async def list_meeting_chapters(meeting_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List a meeting's transcript chapters (labelled topic jump points).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        chapters = await meetings_service.list_chapters(
            call.session, call.ctx, uuid.UUID(meeting_id)
        )
        return {
            "items": [
                TranscriptChapterOut.model_validate(chapter).model_dump(mode="json")
                for chapter in chapters
            ]
        }


@mcp.tool
async def suggest_meeting_project(meeting_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Suggest the project a meeting most likely belongs to, with a 0..1 confidence.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        await meetings_service.get_meeting(call.session, call.ctx, uuid.UUID(meeting_id))
        suggestion = await insight.suggest_route(
            call.session, call.ctx, "meeting", uuid.UUID(meeting_id)
        )
        return RouteSuggestionOut.model_validate(suggestion).model_dump(mode="json")


@mcp.tool
async def run_meeting_recipe(
    meeting_id: str, prompt: str, recipe_id: str | None = None, org_id: str | None = None
) -> dict[str, Any]:
    """Run a saved or ad-hoc recipe prompt over a meeting's transcript (on the org's BYOK key).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = RecipeRunIn(prompt=prompt, recipe_id=uuid.UUID(recipe_id) if recipe_id else None)
        reply, model, ai_run_id = await meetings_service.run_recipe(
            call.session, call.ctx, uuid.UUID(meeting_id), payload
        )
        return {"reply": reply, "model": model, "ai_run_id": str(ai_run_id)}


@mcp.tool
async def get_meeting_share(meeting_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch a meeting's public share record, or null if it has none.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        share = await meetings_service.get_meeting_share(
            call.session, call.ctx, uuid.UUID(meeting_id)
        )
        if share is None:
            return {"share": None}
        return MeetingShareOut.model_validate(share).model_dump(mode="json")


@mcp.tool
async def create_meeting_share(
    meeting_id: str, include_transcript: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Mint (or re-enable) a public share link for a meeting. Creator or org admin only.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = ShareCreateIn(include_transcript=include_transcript)
        share = await meetings_service.create_meeting_share(
            call.session, call.ctx, uuid.UUID(meeting_id), payload
        )
        return MeetingShareOut.model_validate(share).model_dump(mode="json")


@mcp.tool
async def update_meeting_share(
    meeting_id: str,
    include_transcript: bool | None = None,
    revoked: bool | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Toggle a meeting share's transcript inclusion or revoke it. Creator or org admin only.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = ShareUpdateIn(include_transcript=include_transcript, revoked=revoked)
        share = await meetings_service.update_meeting_share(
            call.session, call.ctx, uuid.UUID(meeting_id), payload
        )
        return MeetingShareOut.model_validate(share).model_dump(mode="json")


@mcp.tool
async def meetings_chat(
    question: str,
    project_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    pinned_meeting_ids: list[str] | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Ask a question across the org's meetings, returning a cited, coverage-aware answer.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        scope = None
        if project_id or date_from or date_to or pinned_meeting_ids:
            scope = OrgChatScopeIn(
                project_id=uuid.UUID(project_id) if project_id else None,
                date_from=datetime.fromisoformat(date_from) if date_from else None,
                date_to=datetime.fromisoformat(date_to) if date_to else None,
                pinned=[uuid.UUID(value) for value in (pinned_meeting_ids or [])],
            )
        payload = OrgMeetingChatIn(
            messages=[ChatMessageIn(role="user", content=question)], scope=scope
        )
        reply, model, run_id, citations, coverage = await meetings_service.chat_across_org_meetings(
            call.session, call.ctx, payload
        )
        return OrgMeetingChatOut(
            reply=reply,
            model=model,
            ai_run_id=run_id,
            citations=citations,
            coverage=coverage,
        ).model_dump(mode="json")
