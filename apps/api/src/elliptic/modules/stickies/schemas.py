"""Sticky schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StickyCreateIn(BaseModel):
    """Payload to create a sticky."""

    content: str = Field(default="", max_length=4000)
    color: str = Field(default="yellow", max_length=20)


class StickyUpdateIn(BaseModel):
    """Editable sticky fields."""

    content: str | None = Field(default=None, max_length=4000)
    color: str | None = Field(default=None, max_length=20)
    position: float | None = None


class StickyOut(BaseModel):
    """Serialized sticky."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content: str
    color: str
    position: float
    created_at: datetime
    updated_at: datetime


class StickyConvertIn(BaseModel):
    """Convert a sticky into a task or note (COS-162)."""

    target: str = Field(pattern="^(task|note)$")
    project_id: uuid.UUID | None = None
    delete_after: bool = True


class StickyConvertOut(BaseModel):
    """The entity a sticky was converted into."""

    target: str
    entity_id: uuid.UUID
    project_id: uuid.UUID | None = None
