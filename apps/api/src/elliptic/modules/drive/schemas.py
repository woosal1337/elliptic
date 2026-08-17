"""Drive schemas (COS-409)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from elliptic.modules.storage.models import StoredObjectKind


class DrivePresignIn(BaseModel):
    """Reserve an upload slot for a document that is about to be sent to R2."""

    filename: str = Field(min_length=1, max_length=500)
    content_type: str = Field(min_length=1, max_length=255)
    size_bytes: int = Field(ge=0)


class DriveFileCreateIn(BaseModel):
    """Turn an uploaded stored object into a Drive document."""

    object_id: uuid.UUID
    name: str | None = Field(default=None, max_length=500)
    folder_path: str = Field(default="", max_length=1024)
    description: str | None = None


class DriveFileUpdateIn(BaseModel):
    """Rename, move, or re-describe a document."""

    name: str | None = Field(default=None, min_length=1, max_length=500)
    folder_path: str | None = Field(default=None, max_length=1024)
    description: str | None = None
    clear_description: bool = False


class DriveFileOut(BaseModel):
    """A Drive document, flattened over its stored object."""

    id: uuid.UUID
    name: str
    folder_path: str
    description: str | None
    filename: str
    content_type: str
    kind: StoredObjectKind
    size_bytes: int | None
    uploaded_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class DriveFolderOut(BaseModel):
    """One folder in the Drive, derived from the paths files carry."""

    path: str
    name: str
    file_count: int


class DriveFolderRenameIn(BaseModel):
    """Move every document under one prefix to another."""

    path: str = Field(max_length=1024)
    new_path: str = Field(max_length=1024)
