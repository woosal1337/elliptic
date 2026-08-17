"""Drive endpoints — the organization's uploaded documents (COS-409)."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.drive import service
from elliptic.modules.drive.schemas import (
    DriveFileCreateIn,
    DriveFileOut,
    DriveFileUpdateIn,
    DriveFolderOut,
    DriveFolderRenameIn,
    DrivePresignIn,
)
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.storage.schemas import PresignDownloadOut, PresignUploadOut

router = APIRouter(prefix="/orgs/{org_id}/drive", tags=["drive"])

MemberCtx = Annotated[OrgContext, Depends(require_role(OrgRole.MEMBER))]


@router.post("/presign-upload", status_code=status.HTTP_201_CREATED)
async def presign_upload(
    payload: DrivePresignIn, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[PresignUploadOut]:
    """Reserve a Drive upload and return a presigned PUT URL for the bytes."""
    obj, url = await service.presign(session, ctx, payload)
    return ok(
        PresignUploadOut(
            object_id=obj.id,
            storage_key=obj.storage_key,
            upload_url=url,
            expires_in=900,
            max_bytes=get_settings().file_size_limit_bytes,
        )
    )


@router.post("/files", status_code=status.HTTP_201_CREATED)
async def create_file(
    payload: DriveFileCreateIn, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[DriveFileOut]:
    """File an uploaded object in the Drive."""
    file, obj = await service.register(session, ctx, payload)
    return ok(service.to_out(file, obj), message="Document added")


@router.get("/files")
async def list_files(
    ctx: OrgCtx,
    session: SessionDep,
    page: PageParamsDep,
    folder_path: Annotated[str | None, Query(max_length=1024)] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
    recursive: Annotated[bool, Query()] = False,
) -> SuccessResponse[Page[DriveFileOut]]:
    """List Drive documents in one folder, or across the Drive when searching."""
    rows, total = await service.list_files(
        session, ctx, page, folder_path=folder_path, search=search, recursive=recursive
    )
    items = [service.to_out(file, obj) for file, obj in rows]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/folders")
async def list_folders(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[DriveFolderOut]]:
    """Every folder holding at least one document."""
    rows = await service.list_folders(session, ctx)
    return ok(
        [
            DriveFolderOut(path=path, name=path.rsplit("/", 1)[-1], file_count=count)
            for path, count in rows
        ]
    )


@router.get("/files/{file_id}")
async def get_file(
    file_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DriveFileOut]:
    file, obj = await service.get_file(session, ctx, file_id)
    return ok(service.to_out(file, obj))


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PresignDownloadOut]:
    """A short-lived presigned URL that opens or downloads the document."""
    (_, obj), url = await service.download_url(session, ctx, file_id)
    return ok(PresignDownloadOut(download_url=url, expires_in=300, filename=obj.filename))


@router.get("/files/{file_id}/text")
async def read_file_text(
    file_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200_000)] = 20_000,
) -> SuccessResponse[dict[str, Any]]:
    """A text document's content, a window at a time.

    Served by the API rather than fetched from storage by the client: a presigned
    URL is on the storage origin, so reading it in JavaScript would need a CORS
    policy on the bucket, while rendering it needs none. `readable` is false for a
    format whose bytes are not text — a PDF or an Office file — and the caller
    should show `url` instead.
    """
    return ok(await service.read_text(session, ctx, file_id, offset=offset, limit=limit))


@router.patch("/files/{file_id}")
async def update_file(
    file_id: uuid.UUID, payload: DriveFileUpdateIn, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[DriveFileOut]:
    """Rename, move, or re-describe a document."""
    file, obj = await service.update_file(session, ctx, file_id, payload)
    return ok(service.to_out(file, obj), message="Document updated")


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: uuid.UUID, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_file(session, ctx, file_id)
    return ok(None, message="Document deleted")


@router.post("/folders/rename")
async def rename_folder(
    payload: DriveFolderRenameIn, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[list[DriveFolderOut]]:
    """Move every document under one folder prefix to another."""
    await service.rename_folder(session, ctx, payload.path, payload.new_path)
    rows = await service.list_folders(session, ctx)
    return ok(
        [
            DriveFolderOut(path=path, name=path.rsplit("/", 1)[-1], file_count=count)
            for path, count in rows
        ],
        message="Folder moved",
    )
