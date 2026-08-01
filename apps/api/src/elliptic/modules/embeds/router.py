"""Embed endpoints (COS-149)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.embeds import service
from elliptic.modules.embeds.schemas import EmbedMeta, NoteEmbedOut, UnfurlIn

router = APIRouter(prefix="/orgs/{org_id}", tags=["embeds"])


@router.post("/embeds/unfurl")
async def unfurl(
    payload: UnfurlIn,
    ctx: OrgCtx,  # noqa: ARG001
    session: SessionDep,
) -> SuccessResponse[EmbedMeta]:
    """Preview an external URL's embed metadata without persisting it (COS-149)."""
    return ok(await service.unfurl(session, payload.url))


@router.get("/notes/{note_id}/embeds")
async def list_embeds(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[NoteEmbedOut]]:
    rows = await service.list_embeds(session, ctx, note_id)
    return ok([NoteEmbedOut.model_validate(e) for e in rows])


@router.post("/notes/{note_id}/embeds", status_code=status.HTTP_201_CREATED)
async def create_embed(
    note_id: uuid.UUID, payload: UnfurlIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[NoteEmbedOut]:
    embed = await service.create_embed(session, ctx, note_id, payload.url)
    return ok(NoteEmbedOut.model_validate(embed), message="Embed added")


@router.delete("/notes/{note_id}/embeds/{embed_id}")
async def delete_embed(
    note_id: uuid.UUID,  # noqa: ARG001
    embed_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.delete_embed(session, ctx, embed_id)
    return ok(None, message="Embed removed")
