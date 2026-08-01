"""Embed schemas (COS-149)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UnfurlIn(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class EmbedMeta(BaseModel):
    url: str
    provider: str
    kind: str
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    iframe_url: str | None = None


class NoteEmbedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    note_id: uuid.UUID
    url: str
    provider: str
    kind: str
    title: str | None
    description: str | None
    thumbnail_url: str | None
    iframe_url: str | None
    created_at: datetime
