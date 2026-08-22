"""Note schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoteCreateIn(BaseModel):
    """Payload to create a note."""

    title: str = Field(min_length=1, max_length=500)
    content: str = ""
    icon: str | None = Field(default=None, max_length=16)
    project_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    is_folder: bool = False
    mention_user_ids: list[uuid.UUID] = Field(default_factory=list)


class NoteUpdateIn(BaseModel):
    """Editable note fields."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    content: str | None = None
    icon: str | None = Field(default=None, max_length=16)
    project_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    is_folder: bool | None = None
    mention_user_ids: list[uuid.UUID] = Field(default_factory=list)


class NoteOut(BaseModel):
    """Serialized note."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID | None
    team_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None
    is_folder: bool = False
    title: str
    content: str
    icon: str | None = None
    created_by: uuid.UUID
    updated_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
