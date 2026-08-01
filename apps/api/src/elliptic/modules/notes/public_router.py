"""Publish-page + public-page endpoints (COS-124)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.notes import publish
from elliptic.modules.notes.schemas import (
    PublicCommentIn,
    PublicPageCommentOut,
    PublicPageOut,
    PublishPageOut,
)

publish_router = APIRouter(prefix="/orgs/{org_id}/notes", tags=["notes"])
public_router = APIRouter(prefix="/public/pages", tags=["public-pages"])


@publish_router.post("/{note_id}/publish")
async def publish_page(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PublishPageOut]:
    note = await publish.publish(session, ctx, note_id)
    token = note.public_token or ""
    return ok(
        PublishPageOut(public_token=token, path=f"/public/pages/{token}"), message="Published"
    )


@publish_router.delete("/{note_id}/publish")
async def unpublish_page(
    note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await publish.unpublish(session, ctx, note_id)
    return ok(None, message="Unpublished")


@public_router.get("/{token}")
async def read_public_page(token: str, session: SessionDep) -> SuccessResponse[PublicPageOut]:
    data = await publish.read_public(session, token)
    return ok(PublicPageOut.model_validate(data))


@public_router.post("/{token}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    token: str, payload: PublicCommentIn, session: SessionDep
) -> SuccessResponse[PublicPageCommentOut]:
    comment = await publish.add_public_comment(session, token, payload.author_name, payload.body)
    return ok(PublicPageCommentOut.model_validate(comment), message="Comment posted")


@public_router.post("/{token}/comments/{comment_id}/report")
async def report_comment(
    token: str, comment_id: uuid.UUID, session: SessionDep
) -> SuccessResponse[None]:
    await publish.report_public_comment(session, token, comment_id)
    return ok(None, message="Comment reported")
