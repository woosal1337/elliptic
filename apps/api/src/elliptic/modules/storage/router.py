"""Storage (upload) endpoints (COS-255)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.storage import service
from elliptic.modules.storage.models import StoredObjectEntity
from elliptic.modules.storage.schemas import (
    PresignDownloadOut,
    PresignUploadIn,
    PresignUploadOut,
    StoredObjectOut,
)

router = APIRouter(prefix="/orgs/{org_id}/storage", tags=["storage"])

MemberCtx = Annotated[OrgContext, Depends(require_role(OrgRole.MEMBER))]


@router.post("/presign-upload", status_code=status.HTTP_201_CREATED)
async def presign_upload(
    payload: PresignUploadIn, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[PresignUploadOut]:
    """Reserve a stored object and return a presigned PUT URL for direct R2 upload."""
    from elliptic.core.config import get_settings  # noqa: PLC0415

    obj, url = await service.create_presigned_upload(session, ctx, payload)
    return ok(
        PresignUploadOut(
            object_id=obj.id,
            storage_key=obj.storage_key,
            upload_url=url,
            expires_in=900,
            max_bytes=get_settings().file_size_limit_bytes,
        )
    )


@router.get("/objects")
async def list_objects(
    ctx: OrgCtx,
    session: SessionDep,
    entity_type: Annotated[StoredObjectEntity, Query()],
    entity_id: Annotated[uuid.UUID, Query()],
) -> SuccessResponse[list[StoredObjectOut]]:
    """List uploaded objects attached to an entity (COS-149)."""
    rows = await service.list_for_entity(session, ctx, entity_type, entity_id)
    return ok([StoredObjectOut.model_validate(o) for o in rows])


@router.post("/objects/{object_id}/confirm")
async def confirm_upload(
    object_id: uuid.UUID, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[StoredObjectOut]:
    obj = await service.confirm_upload(session, ctx, object_id)
    return ok(StoredObjectOut.model_validate(obj), message="Upload complete")


@router.get("/objects/{object_id}")
async def get_object(
    object_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[StoredObjectOut]:
    obj = await service.get_object(session, ctx, object_id)
    return ok(StoredObjectOut.model_validate(obj))


@router.get("/objects/{object_id}/download")
async def download(
    object_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PresignDownloadOut]:
    obj, url = await service.create_presigned_download(session, ctx, object_id)
    return ok(PresignDownloadOut(download_url=url, expires_in=300, filename=obj.filename))


@router.delete("/objects/{object_id}")
async def delete_object(
    object_id: uuid.UUID, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_object(session, ctx, object_id)
    return ok(None, message="File deleted")
