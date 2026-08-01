"""Storage service: presigned upload/confirm/download with limits (COS-255)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.storage import client
from elliptic.modules.storage.models import StoredObject, StoredObjectEntity, StoredObjectKind
from elliptic.modules.storage.schemas import PresignUploadIn

_UPLOAD_EXPIRES = 900
_DOWNLOAD_EXPIRES = 300


def _kind_for(content_type: str) -> StoredObjectKind:
    return StoredObjectKind.IMAGE if content_type.startswith("image/") else StoredObjectKind.FILE


async def create_presigned_upload(
    session: AsyncSession, ctx: OrgContext, payload: PresignUploadIn
) -> tuple[StoredObject, str]:
    settings = get_settings()
    if not settings.storage_configured:
        raise BadRequestError("Object storage is not configured")
    if payload.content_type not in settings.allowed_upload_content_type_set:
        raise BadRequestError(f"Content type '{payload.content_type}' is not allowed")
    if payload.size_bytes > settings.file_size_limit_bytes:
        raise BadRequestError(
            f"File exceeds the {settings.file_size_limit_bytes // (1024 * 1024)} MB limit"
        )

    object_id = uuid.uuid4()
    key = client.build_key(ctx.org.id, payload.entity_type.value, object_id, payload.filename)
    obj = StoredObject(
        id=object_id,
        org_id=ctx.org.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        uploaded_by=ctx.user.id,
        storage_key=key,
        filename=payload.filename,
        content_type=payload.content_type,
        kind=_kind_for(payload.content_type),
        size_bytes=payload.size_bytes or None,
        is_uploaded=False,
    )
    session.add(obj)
    await session.flush()
    upload_url = client.presigned_put(key, payload.content_type, expires=_UPLOAD_EXPIRES)
    return obj, upload_url


async def get_object(session: AsyncSession, ctx: OrgContext, object_id: uuid.UUID) -> StoredObject:
    obj = await session.scalar(
        select(StoredObject).where(StoredObject.id == object_id, StoredObject.org_id == ctx.org.id)
    )
    if obj is None:
        raise NotFoundError("File not found")
    return obj


async def confirm_upload(
    session: AsyncSession, ctx: OrgContext, object_id: uuid.UUID
) -> StoredObject:
    """Verify the object actually landed in R2 and re-check size/type server-side."""
    settings = get_settings()
    obj = await get_object(session, ctx, object_id)
    head = await client.head_object(obj.storage_key)
    if head is None:
        raise BadRequestError("Upload not found in storage")
    if head["size"] > settings.file_size_limit_bytes:
        await client.delete_object(obj.storage_key)
        raise BadRequestError("Uploaded file exceeds the size limit")
    obj.size_bytes = head["size"]
    obj.etag = head["etag"]
    obj.is_uploaded = True
    await session.flush()
    return obj


async def create_presigned_download(
    session: AsyncSession, ctx: OrgContext, object_id: uuid.UUID
) -> tuple[StoredObject, str]:
    obj = await get_object(session, ctx, object_id)
    if not obj.is_uploaded:
        raise NotFoundError("File has not finished uploading")
    url = client.presigned_get(obj.storage_key, expires=_DOWNLOAD_EXPIRES, filename=obj.filename)
    return obj, url


async def delete_object(session: AsyncSession, ctx: OrgContext, object_id: uuid.UUID) -> None:
    obj = await get_object(session, ctx, object_id)
    if get_settings().storage_configured:
        await client.delete_object(obj.storage_key)
    await session.delete(obj)
    await session.flush()


async def list_for_entity(
    session: AsyncSession, ctx: OrgContext, entity_type: StoredObjectEntity, entity_id: uuid.UUID
) -> list[StoredObject]:
    result = await session.scalars(
        select(StoredObject)
        .where(
            StoredObject.org_id == ctx.org.id,
            StoredObject.entity_type == entity_type,
            StoredObject.entity_id == entity_id,
            StoredObject.is_uploaded.is_(True),
        )
        .order_by(StoredObject.created_at)
    )
    return list(result)


async def bind_objects(
    session: AsyncSession,
    ctx: OrgContext,
    object_ids: list[uuid.UUID],
    entity_type: StoredObjectEntity,
    entity_id: uuid.UUID,
) -> list[StoredObject]:
    """Attach already-uploaded objects (owned by the caller) to an entity (COS-106/149)."""
    if not object_ids:
        return []
    rows = list(
        await session.scalars(
            select(StoredObject).where(
                StoredObject.id.in_(object_ids),
                StoredObject.org_id == ctx.org.id,
                StoredObject.uploaded_by == ctx.user.id,
                StoredObject.is_uploaded.is_(True),
            )
        )
    )
    for obj in rows:
        obj.entity_type = entity_type
        obj.entity_id = entity_id
    await session.flush()
    return rows


async def objects_for_entities(
    session: AsyncSession,
    org_id: uuid.UUID,
    entity_type: StoredObjectEntity,
    entity_ids: list[uuid.UUID],
) -> dict[uuid.UUID, list[StoredObject]]:
    """Batch-fetch uploaded objects grouped by entity_id (for list serialization)."""
    grouped: dict[uuid.UUID, list[StoredObject]] = {}
    if not entity_ids:
        return grouped
    rows = await session.scalars(
        select(StoredObject)
        .where(
            StoredObject.org_id == org_id,
            StoredObject.entity_type == entity_type,
            StoredObject.entity_id.in_(entity_ids),
            StoredObject.is_uploaded.is_(True),
        )
        .order_by(StoredObject.created_at)
    )
    for obj in rows:
        if obj.entity_id is not None:
            grouped.setdefault(obj.entity_id, []).append(obj)
    return grouped


def attachment_payload(obj: StoredObject, *, url: str | None = None) -> dict[str, object]:
    """Plain dict for an attachment, optionally including a (presigned) URL — for MCP output."""
    return {
        "id": str(obj.id),
        "filename": obj.filename,
        "content_type": obj.content_type,
        "kind": str(obj.kind),
        "size_bytes": obj.size_bytes,
        "is_uploaded": obj.is_uploaded,
        "url": url,
    }


def attachment_with_url(obj: StoredObject) -> dict[str, object]:
    """Attachment payload including a fresh short-lived presigned download URL (COS-106 MCP)."""
    url: str | None = None
    if obj.is_uploaded and get_settings().storage_configured:
        from elliptic.modules.storage import client  # noqa: PLC0415

        url = client.presigned_get(obj.storage_key, filename=obj.filename)
    return attachment_payload(obj, url=url)
