"""Note endpoints."""

import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from fastapi.responses import Response

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.notes import service
from elliptic.modules.notes.export import note_to_html_document
from elliptic.modules.notes.schemas import (
    NoteCreateIn,
    NoteLifecycleIn,
    NoteOut,
    NoteShareIn,
    NoteShareOut,
    NoteUpdateIn,
    NoteVersionOut,
)
from elliptic.modules.tasks import service as tasks_service
from elliptic.modules.tasks.schemas import TaskOut

router = APIRouter(prefix="/orgs/{org_id}/notes", tags=["notes"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.create_note(session, ctx, payload)
    return ok(NoteOut.model_validate(note), message="Note created")


@router.get("")
async def list_notes(
    ctx: OrgCtx,
    session: SessionDep,
    page: PageParamsDep,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
    team_id: Annotated[uuid.UUID | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query()] = False,
) -> SuccessResponse[Page[NoteOut]]:
    notes, total = await service.list_notes(
        session,
        ctx,
        page,
        project_id=project_id,
        team_id=team_id,
        search=search,
        include_archived=include_archived,
    )
    items = [NoteOut.model_validate(note) for note in notes]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/{note_id}")
async def get_note(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.get_note(session, ctx, note_id)
    return ok(NoteOut.model_validate(note))


def _filename(title: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9 _-]+", "", title).strip() or "page"
    return safe[:80]


@router.get("/{note_id}/export.md")
async def export_markdown(note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep) -> Response:
    note = await service.get_note(session, ctx, note_id)
    body = f"# {note.title}\n\n{note.content}"
    return Response(
        content=body,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{_filename(note.title)}.md"'},
    )


@router.get("/{note_id}/export.html")
async def export_html(note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep) -> Response:
    note = await service.get_note(session, ctx, note_id)
    return Response(
        content=note_to_html_document(note.title, note.content),
        media_type="text/html",
        headers={"Content-Disposition": f'inline; filename="{_filename(note.title)}.html"'},
    )


@router.patch("/{note_id}")
async def update_note(
    note_id: uuid.UUID, payload: NoteUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.update_note(session, ctx, note_id, payload)
    return ok(NoteOut.model_validate(note), message="Note updated")


@router.post("/{note_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_note(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.duplicate_note(session, ctx, note_id)
    return ok(NoteOut.model_validate(note), message="Page duplicated")


@router.get("/{note_id}/tasks")
async def list_note_tasks(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskOut]]:
    """Work items created from or linked to this page (COS-144)."""
    await service.get_note(session, ctx, note_id)
    pairs = await tasks_service.list_tasks_for_note(session, ctx, note_id)
    return ok(await tasks_service.serialize_mixed_tasks(session, pairs))


@router.get("/{note_id}/versions")
async def list_note_versions(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[NoteVersionOut]]:
    versions = await service.list_note_versions(session, ctx, note_id)
    return ok([NoteVersionOut.model_validate(version) for version in versions])


@router.post("/{note_id}/versions/{version_id}/restore")
async def restore_note_version(
    note_id: uuid.UUID, version_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.restore_note_version(session, ctx, note_id, version_id)
    return ok(NoteOut.model_validate(note), message="Page restored")


@router.patch("/{note_id}/lifecycle")
async def set_note_lifecycle(
    note_id: uuid.UUID, payload: NoteLifecycleIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.set_note_lifecycle(
        session,
        ctx,
        note_id,
        visibility=payload.visibility,
        locked=payload.locked,
        archived=payload.archived,
    )
    return ok(NoteOut.model_validate(note), message="Page updated")


@router.get("/{note_id}/shares")
async def list_note_shares(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[NoteShareOut]]:
    shares = await service.list_note_shares(session, ctx, note_id)
    return ok([NoteShareOut.model_validate(share) for share in shares])


@router.put("/{note_id}/shares")
async def share_note(
    note_id: uuid.UUID, payload: NoteShareIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteShareOut]:
    share = await service.share_note(session, ctx, note_id, payload.user_id, payload.access)
    return ok(NoteShareOut.model_validate(share), message="Shared")


@router.delete("/{note_id}/shares/{user_id}")
async def unshare_note(
    note_id: uuid.UUID, user_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unshare_note(session, ctx, note_id, user_id)
    return ok(None, message="Unshared")


@router.delete("/{note_id}")
async def delete_note(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_note(session, ctx, note_id)
    return ok(None, message="Note deleted")
