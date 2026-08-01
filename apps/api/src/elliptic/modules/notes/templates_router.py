"""Page (note) template endpoints (COS-245)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, ConfigDict, Field

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.notes import templates_service as service

router = APIRouter(prefix="/orgs/{org_id}/note-templates", tags=["note-templates"])


class NoteTemplateIn(BaseModel):
    """Create a page template."""

    name: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=500)
    content: str = ""
    project_id: uuid.UUID | None = None


class SaveNoteTemplateIn(BaseModel):
    """Save an existing page as a template."""

    name: str = Field(min_length=1, max_length=255)


class NoteTemplateOut(BaseModel):
    """Serialized page template."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None
    name: str
    title: str
    content: str


@router.get("")
async def list_note_templates(
    ctx: OrgCtx,
    session: SessionDep,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[list[NoteTemplateOut]]:
    templates = await service.list_note_templates(session, ctx, project_id)
    return ok([NoteTemplateOut.model_validate(template) for template in templates])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_note_template(
    payload: NoteTemplateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteTemplateOut]:
    template = await service.create_note_template(
        session,
        ctx,
        name=payload.name,
        title=payload.title,
        content=payload.content,
        project_id=payload.project_id,
    )
    return ok(NoteTemplateOut.model_validate(template), message="Template created")


@router.post("/from-note/{note_id}", status_code=status.HTTP_201_CREATED)
async def save_note_as_template(
    note_id: uuid.UUID, payload: SaveNoteTemplateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteTemplateOut]:
    template = await service.save_note_as_template(session, ctx, note_id, payload.name)
    return ok(NoteTemplateOut.model_validate(template), message="Saved as template")


@router.delete("/{template_id}")
async def delete_note_template(
    template_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_note_template(session, ctx, template_id)
    return ok(None, message="Template deleted")
