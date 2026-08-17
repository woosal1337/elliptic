"""Stored object (uploaded file) model — polymorphic, R2-backed (COS-255)."""

import enum
import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class StoredObjectEntity(enum.StrEnum):
    """What an uploaded object is attached to."""

    COMMENT = "comment"
    NOTE = "note"
    TASK = "task"
    AI_CHAT = "ai_chat"
    PROJECT = "project"
    DRIVE = "drive"
    GENERAL = "general"


class StoredObjectKind(enum.StrEnum):
    IMAGE = "image"
    FILE = "file"


class StoredObject(BaseModel):
    """A private file in R2, owned by an org and (optionally) bound to an entity."""

    __tablename__ = "stored_objects"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    entity_type: Mapped[StoredObjectEntity] = mapped_column(
        String(32), default=StoredObjectEntity.GENERAL
    )
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    storage_key: Mapped[str] = mapped_column(String(1024), unique=True, index=True)
    filename: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(255))
    kind: Mapped[StoredObjectKind] = mapped_column(String(16), default=StoredObjectKind.FILE)
    size_bytes: Mapped[int | None] = mapped_column(nullable=True)
    etag: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_uploaded: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))

    __table_args__ = (Index("ix_stored_objects_entity", "org_id", "entity_type", "entity_id"),)
