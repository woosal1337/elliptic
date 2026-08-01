"""Comment endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.comments import service
from elliptic.modules.comments.models import CommentEntityType
from elliptic.modules.comments.schemas import (
    CommentCreateIn,
    CommentOut,
    CommentReactionIn,
    CommentResolveIn,
    CommentUpdateIn,
    CommentVersionOut,
    ReactionSummary,
)
from elliptic.modules.storage.schemas import StoredObjectOut

router = APIRouter(prefix="/orgs/{org_id}/comments", tags=["comments"])


async def _attachments_for(
    session: SessionDep, ctx: OrgCtx, comment_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[StoredObjectOut]]:
    from elliptic.modules.storage import service as storage_service  # noqa: PLC0415
    from elliptic.modules.storage.models import StoredObjectEntity  # noqa: PLC0415

    grouped = await storage_service.objects_for_entities(
        session, ctx.org.id, StoredObjectEntity.COMMENT, comment_ids
    )
    return {cid: [StoredObjectOut.model_validate(o) for o in objs] for cid, objs in grouped.items()}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_comment(
    payload: CommentCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CommentOut]:
    comment = await service.create_comment(session, ctx, payload)
    out = CommentOut.model_validate(comment)
    out.attachments = (await _attachments_for(session, ctx, [comment.id])).get(comment.id, [])
    return ok(out, message="Comment created")


@router.get("")
async def list_comments(
    ctx: OrgCtx,
    session: SessionDep,
    page: PageParamsDep,
    entity_type: Annotated[CommentEntityType | None, Query()] = None,
    entity_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[Page[CommentOut]]:
    comments, total = await service.list_comments(
        session, ctx, page, entity_type=entity_type, entity_id=entity_id
    )
    comment_ids = [comment.id for comment in comments]
    reactions = await service.reactions_for(session, ctx, comment_ids)
    attachments = await _attachments_for(session, ctx, comment_ids)
    items = []
    for comment in comments:
        out = CommentOut.model_validate(comment)
        out.reactions = reactions.get(comment.id, [])
        out.attachments = attachments.get(comment.id, [])
        items.append(out)
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/{comment_id}")
async def get_comment(
    comment_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CommentOut]:
    comment = await service.get_comment(session, ctx, comment_id)
    out = CommentOut.model_validate(comment)
    out.attachments = (await _attachments_for(session, ctx, [comment.id])).get(comment.id, [])
    return ok(out)


@router.patch("/{comment_id}")
async def update_comment(
    comment_id: uuid.UUID, payload: CommentUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CommentOut]:
    comment = await service.update_comment(session, ctx, comment_id, payload)
    return ok(CommentOut.model_validate(comment), message="Comment updated")


@router.get("/{comment_id}/versions")
async def list_comment_versions(
    comment_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[CommentVersionOut]]:
    versions = await service.list_comment_versions(session, ctx, comment_id)
    return ok([CommentVersionOut.model_validate(version) for version in versions])


@router.post("/{comment_id}/reactions")
async def react_to_comment(
    comment_id: uuid.UUID, payload: CommentReactionIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ReactionSummary]]:
    summaries = await service.toggle_reaction(session, ctx, comment_id, payload.emoji)
    return ok(summaries)


@router.post("/{comment_id}/resolve")
async def resolve_comment(
    comment_id: uuid.UUID, payload: CommentResolveIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CommentOut]:
    comment = await service.resolve_comment(session, ctx, comment_id, payload.resolved)
    return ok(
        CommentOut.model_validate(comment),
        message="Comment resolved" if payload.resolved else "Comment reopened",
    )


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_comment(session, ctx, comment_id)
    return ok(None, message="Comment deleted")
