"""Polymorphic comment model."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class CommentEntityType(enum.StrEnum):
    """Entity kinds a comment can attach to."""

    TASK = "task"
    MEETING = "meeting"
    NOTE = "note"


class Comment(BaseModel):
    """A markdown comment attached to a task, meeting, or note."""

    __tablename__ = "comments"
    __table_args__ = (Index("ix_comments_entity", "org_id", "entity_type", "entity_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    entity_type: Mapped[CommentEntityType] = mapped_column(
        Enum(CommentEntityType, native_enum=False, length=20)
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    anchor: Mapped[str | None] = mapped_column(Text, nullable=True)


class CommentVersion(BaseModel):
    """A snapshot of a comment's content before it was edited."""

    __tablename__ = "comment_versions"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    comment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    edited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class CommentReaction(BaseModel):
    """An emoji reaction by a user on a comment (one per emoji per user)."""

    __tablename__ = "comment_reactions"
    __table_args__ = (
        UniqueConstraint(
            "comment_id", "user_id", "emoji", name="uq_comment_reactions_comment_id_user_id_emoji"
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    comment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    emoji: Mapped[str] = mapped_column(String(32))
