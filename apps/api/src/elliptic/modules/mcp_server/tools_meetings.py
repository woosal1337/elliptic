"""Meeting read, import, and edit tools (Folio-native)."""

import uuid
from datetime import datetime
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.core.pagination import PageParams
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.meetings import service as meetings_service
from elliptic.modules.meetings.schemas import (
    FolioImportIn,
    MeetingCreateIn,
    MeetingOut,
    MeetingShareOut,
    MeetingUpdateIn,
    SegmentOut,
    ShareCreateIn,
    ShareUpdateIn,
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
