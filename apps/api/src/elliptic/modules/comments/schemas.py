"""Comment schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.comments.models import CommentEntityType, CommentVisibility
from elliptic.modules.storage.schemas import StoredObjectOut


class CommentCreateIn(BaseModel):
    """Payload to create a comment on an entity."""

    entity_type: CommentEntityType
    entity_id: uuid.UUID
    content: str = Field(min_length=1)
    parent_id: uuid.UUID | None = None
    visibility: CommentVisibility = CommentVisibility.INTERNAL
    anchor: str | None = Field(default=None, max_length=2000)
    mention_user_ids: list[uuid.UUID] = Field(default_factory=list)
    attachment_ids: list[uuid.UUID] = Field(default_factory=list)


class CommentUpdateIn(BaseModel):
    """Editable comment fields."""

    content: str = Field(min_length=1)


class CommentResolveIn(BaseModel):
    """Set or clear a comment's resolved state."""

    resolved: bool


class CommentReactionIn(BaseModel):
    """Toggle an emoji reaction on a comment."""

    emoji: str = Field(min_length=1, max_length=32)


class ReactionSummary(BaseModel):
    """Aggregated reactions for a single emoji on a comment."""

    emoji: str
    count: int
    reacted: bool


class CommentOut(BaseModel):
    """Serialized comment."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    entity_type: CommentEntityType
    entity_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    parent_id: uuid.UUID | None
    visibility: CommentVisibility = CommentVisibility.INTERNAL
    anchor: str | None = None
    resolved_at: datetime | None
    edited_at: datetime | None = None
    reactions: list[ReactionSummary] = []
    attachments: list[StoredObjectOut] = []
    created_at: datetime
    updated_at: datetime


class CommentVersionOut(BaseModel):
    """A prior-content snapshot of a comment."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    comment_id: uuid.UUID
    content: str
    edited_by: uuid.UUID | None
    created_at: datetime
