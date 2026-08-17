"""Drive business logic: upload, browse, rename, move, delete (COS-409).

The Drive is org-scoped on purpose. A document (a signed contract, a floor plan,
a spec PDF) is referenced from more than one project, so binding it to a project
would make the second reference a copy. Folders keep it navigable instead.
"""

import uuid
from typing import Any

from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.core.pagination import PageParams
from elliptic.modules.drive.models import DriveFile
from elliptic.modules.drive.schemas import (
    DriveFileCreateIn,
    DriveFileOut,
    DriveFileUpdateIn,
    DrivePresignIn,
)
from elliptic.modules.storage import client as storage_client
from elliptic.modules.storage import service as storage_service
from elliptic.modules.storage.models import StoredObject, StoredObjectEntity
from elliptic.modules.storage.schemas import PresignUploadIn

_MAX_FOLDER_DEPTH = 10
_MAX_SEGMENT = 120
_MAX_PATH = 1024

FileRow = tuple[DriveFile, StoredObject]


def normalize_folder(path: str | None) -> str:
    """Normalize a folder path to ``a/b/c`` form, with "" for the Drive root.

    Rejects a segment that would climb out of the Drive or exceed the column, so
    a path can never address anything but this org's own folders.
    """
    if path is None:
        return ""
    segments = [segment.strip() for segment in path.replace("\\", "/").split("/")]
    cleaned: list[str] = []
    for segment in segments:
        if not segment or segment == ".":
            continue
        if segment == "..":
            raise BadRequestError("A folder path cannot contain '..'")
        if len(segment) > _MAX_SEGMENT:
            raise BadRequestError(f"A folder name cannot exceed {_MAX_SEGMENT} characters")
        cleaned.append(segment)
    if len(cleaned) > _MAX_FOLDER_DEPTH:
        raise BadRequestError(f"A folder path cannot be deeper than {_MAX_FOLDER_DEPTH} levels")
    joined = "/".join(cleaned)
    if len(joined) > _MAX_PATH:
        raise BadRequestError("That folder path is too long")
    return joined


def to_out(file: DriveFile, obj: StoredObject) -> DriveFileOut:
    """Flatten a drive file over its stored object for the API."""
    return DriveFileOut(
        id=file.id,
        name=file.name,
        folder_path=file.folder_path,
        description=file.description,
        filename=obj.filename,
        content_type=obj.content_type,
        kind=obj.kind,
        size_bytes=obj.size_bytes,
        uploaded_by=file.uploaded_by,
        created_at=file.created_at,
        updated_at=file.updated_at,
    )


def payload(file: DriveFile, obj: StoredObject, *, url: str | None = None) -> dict[str, Any]:
    """Plain dict for one drive file — the MCP shape."""
    return {
        "id": str(file.id),
        "name": file.name,
        "folder_path": file.folder_path,
        "description": file.description,
        "filename": obj.filename,
        "content_type": obj.content_type,
        "kind": str(obj.kind),
        "size_bytes": obj.size_bytes,
        "mention": f"[{file.name}](/__mention/file/{file.id})",
        "created_at": file.created_at.isoformat(),
        "url": url,
    }


async def presign(
    session: AsyncSession, ctx: OrgContext, data: DrivePresignIn
) -> tuple[StoredObject, str]:
    """Reserve a Drive upload and return the presigned PUT URL for the bytes."""
    return await storage_service.create_presigned_upload(
        session,
        ctx,
        PresignUploadIn(
            entity_type=StoredObjectEntity.DRIVE,
            filename=data.filename,
            content_type=data.content_type,
            size_bytes=data.size_bytes,
        ),
    )


async def register(session: AsyncSession, ctx: OrgContext, data: DriveFileCreateIn) -> FileRow:
    """Confirm an uploaded object and file it in the Drive."""
    existing = await session.scalar(
        select(DriveFile).where(
            DriveFile.stored_object_id == data.object_id, DriveFile.org_id == ctx.org.id
        )
    )
    if existing is not None:
        raise BadRequestError("That upload is already in the Drive")

    obj = await storage_service.confirm_upload(session, ctx, data.object_id)
    # The column is a plain String, so a row read back carries a str rather than
    # the enum member — compare by value, not identity.
    if obj.entity_type != StoredObjectEntity.DRIVE:
        raise BadRequestError("That upload was not reserved for the Drive")

    file = DriveFile(
        org_id=ctx.org.id,
        stored_object_id=obj.id,
        name=(data.name or obj.filename).strip() or obj.filename,
        folder_path=normalize_folder(data.folder_path),
        description=(data.description or None),
        uploaded_by=ctx.user.id,
    )
    session.add(file)
    await session.flush()
    return file, obj


def _rows_query(org_id: uuid.UUID) -> Select[tuple[DriveFile, StoredObject]]:
    return (
        select(DriveFile, StoredObject)
        .join(StoredObject, StoredObject.id == DriveFile.stored_object_id)
        .where(DriveFile.org_id == org_id)
    )


async def list_files(
    session: AsyncSession,
    ctx: OrgContext,
    page: PageParams,
    *,
    folder_path: str | None = None,
    search: str | None = None,
    recursive: bool = False,
) -> tuple[list[FileRow], int]:
    """List Drive documents in one folder, or everywhere when searching."""
    query = _rows_query(ctx.org.id)
    count = select(func.count()).select_from(DriveFile).where(DriveFile.org_id == ctx.org.id)

    if folder_path is not None:
        folder = normalize_folder(folder_path)
        folder_clause: ColumnElement[bool] | None = None
        if recursive and folder:
            folder_clause = or_(
                DriveFile.folder_path == folder,
                DriveFile.folder_path.startswith(f"{folder}/"),
            )
        elif not recursive:
            folder_clause = DriveFile.folder_path == folder
        if folder_clause is not None:
            query = query.where(folder_clause)
            count = count.where(folder_clause)

    if search:
        like = f"%{search.strip()}%"
        search_clause = or_(DriveFile.name.ilike(like), DriveFile.description.ilike(like))
        query = query.where(search_clause)
        count = count.where(search_clause)

    total = await session.scalar(count) or 0
    result = await session.execute(
        query.order_by(DriveFile.folder_path, DriveFile.name).limit(page.limit).offset(page.offset)
    )
    return [(file, obj) for file, obj in result.all()], total


async def list_folders(session: AsyncSession, ctx: OrgContext) -> list[tuple[str, int]]:
    """Every folder that holds at least one document, with its direct file count."""
    result = await session.execute(
        select(DriveFile.folder_path, func.count(DriveFile.id))
        .where(DriveFile.org_id == ctx.org.id, DriveFile.folder_path != "")
        .group_by(DriveFile.folder_path)
        .order_by(DriveFile.folder_path)
    )
    return [(path, count) for path, count in result.all()]


async def get_file(session: AsyncSession, ctx: OrgContext, file_id: uuid.UUID) -> FileRow:
    row = (await session.execute(_rows_query(ctx.org.id).where(DriveFile.id == file_id))).first()
    if row is None:
        raise NotFoundError("Document not found")
    file, obj = row
    return file, obj


async def download_url(
    session: AsyncSession, ctx: OrgContext, file_id: uuid.UUID
) -> tuple[FileRow, str]:
    """A short-lived presigned GET URL for one document."""
    file, obj = await get_file(session, ctx, file_id)
    _, url = await storage_service.create_presigned_download(session, ctx, obj.id)
    return (file, obj), url


async def update_file(
    session: AsyncSession, ctx: OrgContext, file_id: uuid.UUID, data: DriveFileUpdateIn
) -> FileRow:
    file, obj = await get_file(session, ctx, file_id)
    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise BadRequestError("A document needs a name")
        file.name = name
    if data.folder_path is not None:
        file.folder_path = normalize_folder(data.folder_path)
    if data.clear_description:
        file.description = None
    elif data.description is not None:
        file.description = data.description or None
    await session.flush()
    return file, obj


async def delete_file(session: AsyncSession, ctx: OrgContext, file_id: uuid.UUID) -> None:
    """Remove a document and the bytes behind it."""
    file, obj = await get_file(session, ctx, file_id)
    await session.delete(file)
    await session.flush()
    await storage_service.delete_object(session, ctx, obj.id)


async def rename_folder(session: AsyncSession, ctx: OrgContext, path: str, new_path: str) -> int:
    """Move every document under one prefix to another. Returns the files moved."""
    folder = normalize_folder(path)
    target = normalize_folder(new_path)
    if not folder:
        raise BadRequestError("The Drive root cannot be renamed")
    if not target:
        raise BadRequestError("A folder needs a name")
    if target == folder:
        return 0
    if target.startswith(f"{folder}/"):
        raise BadRequestError("A folder cannot be moved inside itself")

    prefix = f"{folder}/"
    rows = list(
        await session.scalars(
            select(DriveFile).where(
                DriveFile.org_id == ctx.org.id,
                (DriveFile.folder_path == folder) | DriveFile.folder_path.startswith(prefix),
            )
        )
    )
    for row in rows:
        suffix = row.folder_path[len(folder) :]
        row.folder_path = normalize_folder(f"{target}{suffix}")
    await session.flush()
    return len(rows)


async def read_text(
    session: AsyncSession,
    ctx: OrgContext,
    file_id: uuid.UUID,
    *,
    offset: int = 0,
    limit: int = 20000,
) -> dict[str, Any]:
    """Read a text-shaped document's content, for an agent that cannot fetch a URL.

    Only formats whose bytes *are* text are decoded here. A PDF or a .docx needs
    an extraction step that this build does not have, so it reports the type and
    hands back a download URL instead of a wall of binary.
    """
    file, obj = await get_file(session, ctx, file_id)
    textual = obj.content_type.startswith("text/") or obj.content_type in {
        "application/json",
        "application/xml",
    }
    if not textual:
        _, url = await storage_service.create_presigned_download(session, ctx, obj.id)
        return {
            **payload(file, obj, url=url),
            "text": None,
            "readable": False,
            "reason": (
                f"'{obj.content_type}' is not plain text. Fetch `url` to read it, "
                "or view it as an image if it is one."
            ),
        }

    data = await storage_client.get_bytes(obj.storage_key)
    if data is None:
        raise NotFoundError("The document could not be read from storage")
    decoded = data.decode("utf-8", errors="replace")
    window = decoded[offset : offset + limit]
    return {
        **payload(file, obj),
        "text": window,
        "readable": True,
        "offset": offset,
        "returned_chars": len(window),
        "total_chars": len(decoded),
        "truncated": offset + len(window) < len(decoded),
    }
