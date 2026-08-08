"""Note schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.notes.models import NoteShareAccess, NoteVisibility


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
    visibility: NoteVisibility = NoteVisibility.PUBLIC
    locked: bool = False
    archived_at: datetime | None = None
    created_by: uuid.UUID
    updated_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class NoteLifecycleIn(BaseModel):
    """Change a page's visibility, lock, and/or archive state."""

    visibility: NoteVisibility | None = None
    locked: bool | None = None
    archived: bool | None = None


class NoteShareIn(BaseModel):
    """Grant a member access to a page."""

    user_id: uuid.UUID
    access: NoteShareAccess = NoteShareAccess.VIEW


class NoteShareOut(BaseModel):
    """A serialized per-member page share."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    note_id: uuid.UUID
    user_id: uuid.UUID
    access: NoteShareAccess


class NoteVersionOut(BaseModel):
    """A serialized prior version of a page."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    note_id: uuid.UUID
    title: str
    content: str
    edited_by: uuid.UUID | None
    created_at: datetime


class PublishPageOut(BaseModel):
    """A published page's public token + path (COS-124)."""

    public_token: str
    path: str


class PublicCommentIn(BaseModel):
    """An anonymous comment on a public page."""

    author_name: str = Field(default="Anonymous", max_length=120)
    body: str = Field(min_length=1, max_length=4000)


class PublicPageCommentOut(BaseModel):
    """A public-page comment."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_name: str
    body: str
    created_at: datetime


class PublicPageOut(BaseModel):
    """A published page rendered for anonymous readers."""

    title: str
    icon: str | None = None
    content_html: str
    comments: list[PublicPageCommentOut]
