"""Storage (upload) schemas (COS-255)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.storage.models import StoredObjectEntity, StoredObjectKind


class PresignUploadIn(BaseModel):
    entity_type: StoredObjectEntity = StoredObjectEntity.GENERAL
    entity_id: uuid.UUID | None = None
    filename: str = Field(min_length=1, max_length=500)
    content_type: str = Field(min_length=1, max_length=255)
    size_bytes: int = Field(ge=0)


class PresignUploadOut(BaseModel):
    object_id: uuid.UUID
    storage_key: str
    upload_url: str
    expires_in: int
    max_bytes: int


class StoredObjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity_type: StoredObjectEntity
    entity_id: uuid.UUID | None
    filename: str
    content_type: str
    kind: StoredObjectKind
    size_bytes: int | None
    is_uploaded: bool
    created_at: datetime


class PresignDownloadOut(BaseModel):
    download_url: str
    expires_in: int
    filename: str
