"""Comment read/write tools."""

import uuid
from typing import TYPE_CHECKING, Any

from fastmcp.utilities.types import Image
from mcp.types import ToolAnnotations

from elliptic.core.pagination import PageParams
from elliptic.modules.comments import service as comments_service
from elliptic.modules.comments.models import CommentEntityType
from elliptic.modules.comments.schemas import CommentCreateIn, CommentOut, CommentUpdateIn
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.storage import client as storage_client
from elliptic.modules.storage import service as storage_service
from elliptic.modules.storage.models import StoredObjectEntity

if TYPE_CHECKING:
    from elliptic.modules.comments.models import Comment
    from elliptic.modules.mcp_server.principal import McpCall


async def _attach_attachments(
    call: "McpCall", items: list[dict[str, Any]], comments: "list[Comment]"
) -> None:
    """Populate each serialized comment's `attachments` with metadata + a presigned URL.

    The REST CommentOut leaves attachments empty (they're enriched in the router), so the
    MCP layer must do the same enrichment for agents — including a fetchable image/file URL.
    """
    grouped = await storage_service.objects_for_entities(
        call.session,
        call.ctx.org.id,
        StoredObjectEntity.COMMENT,
        [comment.id for comment in comments],
    )
    for item in items:
        objs = grouped.get(uuid.UUID(item["id"]), [])
        item["attachments"] = [storage_service.attachment_with_url(o) for o in objs]


@mcp.tool
async def list_comments(
    entity_type: str,
    entity_id: str,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    """List comments on an entity (task, meeting, or note), including any attachments.

    Each comment's `attachments` carries the file name, type, and a short-lived `url` you can
    fetch; call `view_image_attachment` to actually see an image inline.
    """
    async with mcp_call("comments:read") as call:
        comments, total = await comments_service.list_comments(
            call.session,
            call.ctx,
            PageParams(limit=limit, offset=offset),
            entity_type=CommentEntityType(entity_type),
            entity_id=uuid.UUID(entity_id),
        )
        items = [CommentOut.model_validate(comment).model_dump(mode="json") for comment in comments]
        await _attach_attachments(call, items, comments)
        return {"total": total, "items": items}


@mcp.tool
async def get_comment(comment_id: str) -> dict[str, Any]:
    """Fetch one comment by id, including its attachments (name/type + fetchable url)."""
    async with mcp_call("comments:read") as call:
        comment = await comments_service.get_comment(call.session, call.ctx, uuid.UUID(comment_id))
        item = CommentOut.model_validate(comment).model_dump(mode="json")
        await _attach_attachments(call, [item], [comment])
        return item


@mcp.tool
async def create_comment(
    entity_type: str,
    entity_id: str,
    body: str,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Create a comment on an entity (task, meeting, or note)."""
    async with mcp_call("comments:write") as call:

        async def _produce() -> dict[str, Any]:
            payload = CommentCreateIn(
                entity_type=CommentEntityType(entity_type),
                entity_id=uuid.UUID(entity_id),
                content=body,
            )
            comment = await comments_service.create_comment(call.session, call.ctx, payload)
            item = CommentOut.model_validate(comment).model_dump(mode="json")
            await _attach_attachments(call, [item], [comment])
            return item

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_comment",
            producer=_produce,
        )


@mcp.tool
async def update_comment(comment_id: str, body: str) -> dict[str, Any]:
    """Edit a comment's content as its author or an admin."""
    async with mcp_call("comments:write") as call:
        payload = CommentUpdateIn(content=body)
        comment = await comments_service.update_comment(
            call.session, call.ctx, uuid.UUID(comment_id), payload
        )
        item = CommentOut.model_validate(comment).model_dump(mode="json")
        await _attach_attachments(call, [item], [comment])
        return item


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_comment(comment_id: str, confirm: bool = False) -> dict[str, Any]:
    """Delete a comment. Preview unless confirm=true."""
    async with mcp_call("comments:write") as call:
        comment = await comments_service.get_comment(call.session, call.ctx, uuid.UUID(comment_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_comment",
                "comment_id": comment_id,
                "snippet": comment.content[:80],
                "hint": "Re-call delete_comment with confirm=true to permanently delete.",
            }
        await comments_service.delete_comment(call.session, call.ctx, uuid.UUID(comment_id))
        return {"deleted": True, "comment_id": comment_id}


@mcp.tool
async def get_attachment(object_id: str) -> dict[str, Any]:
    """Resolve a fresh, short-lived download URL + metadata for an attachment (image or file)
    on a comment or note, so you can fetch it or hand the link to the user."""
    async with mcp_call("comments:read") as call:
        obj, url = await storage_service.create_presigned_download(
            call.session, call.ctx, uuid.UUID(object_id)
        )
        return {
            **storage_service.attachment_payload(obj, url=url),
            "download_url": url,
            "expires_in": 300,
        }


@mcp.tool
async def view_image_attachment(object_id: str) -> Image:
    """Return an image attachment's actual pixels so you can SEE it inline. For non-image
    files use `get_attachment` to get a download link instead."""
    async with mcp_call("comments:read") as call:
        obj = await storage_service.get_object(call.session, call.ctx, uuid.UUID(object_id))
        if str(obj.kind) != "image" or not obj.is_uploaded:
            raise ValueError("That attachment is not a viewable image; use get_attachment instead")
        data = await storage_client.get_bytes(obj.storage_key)
        if data is None:
            raise ValueError("The image could not be read from storage")
        fmt = obj.content_type.removeprefix("image/").split("+", 1)[0] or "png"
        return Image(data=data, format=fmt)
