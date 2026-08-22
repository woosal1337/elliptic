"""Note endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.notes import service
from elliptic.modules.notes.schemas import NoteCreateIn, NoteOut, NoteUpdateIn

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
) -> SuccessResponse[Page[NoteOut]]:
    notes, total = await service.list_notes(
        session,
        ctx,
        page,
        project_id=project_id,
        team_id=team_id,
        search=search,
    )
    items = [NoteOut.model_validate(note) for note in notes]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/{note_id}")
async def get_note(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.get_note(session, ctx, note_id)
    return ok(NoteOut.model_validate(note))


@router.patch("/{note_id}")
async def update_note(
    note_id: uuid.UUID, payload: NoteUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteOut]:
    note = await service.update_note(session, ctx, note_id, payload)
    return ok(NoteOut.model_validate(note), message="Note updated")


@router.delete("/{note_id}")
async def delete_note(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_note(session, ctx, note_id)
    return ok(None, message="Note deleted")
