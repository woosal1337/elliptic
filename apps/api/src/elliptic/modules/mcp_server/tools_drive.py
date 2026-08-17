"""Drive tools — the org's uploaded documents, for agents (COS-409).

Upload is deliberately two-step. MCP tool arguments are written by the model, so
base64 content costs about 1.4 tokens per byte of file and a real document does
not fit. ``create_drive_upload`` hands back a presigned PUT URL; the agent sends
the bytes with its own HTTP or shell, then calls ``register_drive_file``. Inline
base64 stays available for a genuinely small file.
"""

import base64
import binascii
import uuid
from typing import Any

from fastmcp.utilities.types import Image
from mcp.types import ToolAnnotations

from elliptic.core.config import get_settings
from elliptic.core.pagination import PageParams
from elliptic.modules.drive import service as drive_service
from elliptic.modules.drive.schemas import DriveFileCreateIn, DriveFileUpdateIn, DrivePresignIn
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.storage import client as storage_client

_INLINE_LIMIT = 256 * 1024


@mcp.tool
async def list_drive_files(
    folder_path: str | None = None,
    search: str | None = None,
    recursive: bool = False,
    limit: int = 50,
    offset: int = 0,
    org_id: str | None = None,
) -> dict[str, Any]:
    """List the documents in the organization's Drive.

    Pass folder_path to look inside one folder ("" or omitted lists everything),
    recursive=true to include its subfolders, or search to match a name or
    description across the Drive. Each item carries a `mention` string you can
    paste into a task description to link the document.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:read", org_id=org_id) as call:
        rows, total = await drive_service.list_files(
            call.session,
            call.ctx,
            PageParams(limit=limit, offset=offset),
            folder_path=folder_path,
            search=search,
            recursive=recursive,
        )
        return {
            "total": total,
            "items": [drive_service.payload(file, obj) for file, obj in rows],
        }


@mcp.tool
async def list_drive_folders(org_id: str | None = None) -> dict[str, Any]:
    """List the Drive's folders and how many documents each one holds directly.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:read", org_id=org_id) as call:
        rows = await drive_service.list_folders(call.session, call.ctx)
        return {
            "total": len(rows),
            "items": [
                {"path": path, "name": path.rsplit("/", 1)[-1], "file_count": count}
                for path, count in rows
            ],
        }


@mcp.tool
async def get_drive_file(file_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one Drive document's metadata plus a short-lived download URL.

    The `url` expires in 300 seconds; call this again for a fresh one. Use
    `read_drive_file` when you want the text rather than a link.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:read", org_id=org_id) as call:
        (file, obj), url = await drive_service.download_url(
            call.session, call.ctx, uuid.UUID(file_id)
        )
        return drive_service.payload(file, obj, url=url)


@mcp.tool
async def read_drive_file(
    file_id: str, offset: int = 0, limit: int = 20000, org_id: str | None = None
) -> dict[str, Any]:
    """Read a text document's content out of the Drive, a window at a time.

    Works for text/*, JSON and XML. `truncated` tells you there is more; raise
    offset to continue. A PDF or Office file reports readable=false and gives you
    a download URL instead — this build extracts no text from those formats.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:read", org_id=org_id) as call:
        return await drive_service.read_text(
            call.session, call.ctx, uuid.UUID(file_id), offset=offset, limit=limit
        )


@mcp.tool
async def create_drive_upload(
    filename: str,
    content_type: str,
    size_bytes: int,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Reserve a Drive upload and get a presigned PUT URL to send the bytes to.

    This is the upload path for anything but a tiny file. Send the bytes yourself
    (`curl -X PUT -H "Content-Type: <content_type>" --upload-file <path> "<upload_url>"`
    — the Content-Type header must match exactly, or R2 rejects the signature),
    then call `register_drive_file` with the returned object_id to file it in the
    Drive under a name and folder.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:write", org_id=org_id) as call:
        obj, url = await drive_service.presign(
            call.session,
            call.ctx,
            DrivePresignIn(filename=filename, content_type=content_type, size_bytes=size_bytes),
        )
        return {
            "object_id": str(obj.id),
            "upload_url": url,
            "expires_in": 900,
            "method": "PUT",
            "headers": {"Content-Type": content_type},
            "max_bytes": get_settings().file_size_limit_bytes,
            "next_step": "register_drive_file(object_id=…, name=…, folder_path=…)",
        }


@mcp.tool
async def register_drive_file(
    object_id: str,
    name: str | None = None,
    folder_path: str = "",
    description: str | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """File an uploaded object in the Drive, after its bytes have landed.

    Confirms the upload against storage first, so a PUT that never completed
    fails here rather than leaving a broken document behind.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            file, obj = await drive_service.register(
                call.session,
                call.ctx,
                DriveFileCreateIn(
                    object_id=uuid.UUID(object_id),
                    name=name,
                    folder_path=folder_path,
                    description=description,
                ),
            )
            return drive_service.payload(file, obj)

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="register_drive_file",
            producer=_produce,
        )


@mcp.tool
async def upload_drive_file_inline(
    filename: str,
    content_base64: str,
    content_type: str,
    name: str | None = None,
    folder_path: str = "",
    description: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Upload a SMALL document (256 KB decoded, hard cap) straight from base64.

    Only for something you already hold as text or a tiny file. For anything
    larger use `create_drive_upload` — base64 in a tool argument is written by the
    model, so a real document costs an unusable number of tokens.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:write", org_id=org_id) as call:
        try:
            data = base64.b64decode(content_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("content_base64 is not valid base64") from exc
        if len(data) > _INLINE_LIMIT:
            raise ValueError(
                f"{len(data)} bytes is past the {_INLINE_LIMIT} byte inline limit; "
                "use create_drive_upload instead"
            )

        obj, _ = await drive_service.presign(
            call.session,
            call.ctx,
            DrivePresignIn(filename=filename, content_type=content_type, size_bytes=len(data)),
        )
        await storage_client.put_bytes(obj.storage_key, data, content_type)
        file, obj = await drive_service.register(
            call.session,
            call.ctx,
            DriveFileCreateIn(
                object_id=obj.id, name=name, folder_path=folder_path, description=description
            ),
        )
        return drive_service.payload(file, obj)


@mcp.tool
async def update_drive_file(
    file_id: str,
    name: str | None = None,
    folder_path: str | None = None,
    description: str | None = None,
    clear_description: bool = False,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Rename a document, move it to another folder, or edit its description.

    Pass clear_description=true to empty the description — an omitted argument
    and an explicit null arrive identically over the tool boundary.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:write", org_id=org_id) as call:
        file, obj = await drive_service.update_file(
            call.session,
            call.ctx,
            uuid.UUID(file_id),
            DriveFileUpdateIn(
                name=name,
                folder_path=folder_path,
                description=description,
                clear_description=clear_description,
            ),
        )
        return drive_service.payload(file, obj)


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_drive_file(
    file_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a Drive document and its stored bytes. Preview unless confirm=true.

    Any task description that mentions the document keeps the link text, which
    then resolves to nothing — check `search` for references before you confirm.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:write", org_id=org_id) as call:
        file, obj = await drive_service.get_file(call.session, call.ctx, uuid.UUID(file_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_drive_file",
                "name": file.name,
                "folder_path": file.folder_path,
                "size_bytes": obj.size_bytes,
                "hint": "Re-call delete_drive_file with confirm=true to permanently delete.",
            }
        await drive_service.delete_file(call.session, call.ctx, uuid.UUID(file_id))
        return {"deleted": True, "file_id": file_id}


@mcp.tool
async def view_drive_image(file_id: str, org_id: str | None = None) -> Image:
    """Return a Drive image's actual pixels so you can SEE it inline.

    For a non-image document use `get_drive_file` for a download link, or
    `read_drive_file` for text.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("drive:read", org_id=org_id) as call:
        _, obj = await drive_service.get_file(call.session, call.ctx, uuid.UUID(file_id))
        if not obj.content_type.startswith("image/"):
            raise ValueError("That document is not an image; use get_drive_file instead")
        data = await storage_client.get_bytes(obj.storage_key)
        if data is None:
            raise ValueError("The image could not be read from storage")
        return Image(data=data, format=obj.content_type.removeprefix("image/"))
