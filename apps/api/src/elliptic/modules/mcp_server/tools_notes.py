"""Note read/write tools."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.core.pagination import PageParams
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.notes import service as notes_service
from elliptic.modules.notes.schemas import NoteCreateIn, NoteOut, NoteUpdateIn


@mcp.tool
async def list_notes(
    project_id: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    org_id: str | None = None,
) -> dict[str, Any]:
    """List the org's notes, optionally filtered by project or text search.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notes:read", org_id=org_id) as call:
        notes, total = await notes_service.list_notes(
            call.session,
            call.ctx,
            PageParams(limit=limit, offset=offset),
            project_id=uuid.UUID(project_id) if project_id else None,
            search=search,
        )
        items = [NoteOut.model_validate(note).model_dump(mode="json") for note in notes]
        return {"total": total, "items": items}


@mcp.tool
async def get_note(note_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one note by id.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notes:read", org_id=org_id) as call:
        note = await notes_service.get_note(call.session, call.ctx, uuid.UUID(note_id))
        return NoteOut.model_validate(note).model_dump(mode="json")


@mcp.tool
async def create_note(
    title: str,
    content: str = "",
    project_id: str | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a markdown note (org- or project-scoped).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notes:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = NoteCreateIn(
                title=title,
                content=content,
                project_id=uuid.UUID(project_id) if project_id else None,
            )
            note = await notes_service.create_note(call.session, call.ctx, payload)
            return NoteOut.model_validate(note).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_note",
            producer=_produce,
        )


@mcp.tool
async def update_note(
    note_id: str,
    title: str | None = None,
    content: str | None = None,
    project_id: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update a note's title, body, or project.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notes:write", org_id=org_id) as call:
        payload = NoteUpdateIn(
            title=title,
            content=content,
            project_id=uuid.UUID(project_id) if project_id else None,
        )
        note = await notes_service.update_note(call.session, call.ctx, uuid.UUID(note_id), payload)
        return NoteOut.model_validate(note).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_note(
    note_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a note. Preview unless confirm=true.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("notes:write", org_id=org_id) as call:
        note = await notes_service.get_note(call.session, call.ctx, uuid.UUID(note_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_note",
                "title": note.title,
                "hint": "Re-call delete_note with confirm=true to permanently delete.",
            }
        await notes_service.delete_note(call.session, call.ctx, uuid.UUID(note_id))
        return {"deleted": True, "note_id": note_id}
