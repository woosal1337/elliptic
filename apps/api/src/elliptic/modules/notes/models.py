"""Markdown note (page) models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class NoteVisibility(enum.StrEnum):
    """Who can see a page. (Archived is a separate lifecycle flag, not a tier.)"""

    PUBLIC = "public"
    PRIVATE = "private"
    SHARED = "shared"


class NoteShareAccess(enum.StrEnum):
    """Per-member access level on a shared/private page."""

    VIEW = "view"
    COMMENT = "comment"
    EDIT = "edit"


class Note(BaseModel):
    """A markdown note within an organization, optionally tied to a project."""

    __tablename__ = "notes"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(16), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    visibility: Mapped[NoteVisibility] = mapped_column(
        Enum(NoteVisibility, native_enum=False, length=20),
        default=NoteVisibility.PUBLIC,
        server_default=NoteVisibility.PUBLIC.name,
    )
    locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    public_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    updated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class NoteShare(BaseModel):
    """A per-member grant of access to a private/shared page."""

    __tablename__ = "note_shares"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    access: Mapped[NoteShareAccess] = mapped_column(
        Enum(NoteShareAccess, native_enum=False, length=20),
        default=NoteShareAccess.VIEW,
        server_default=NoteShareAccess.VIEW.name,
    )


class NoteVersion(BaseModel):
    """An immutable snapshot of a page's title + content before an edit.

    Auto-captured on every content/title edit, attributed to the editor, so the
    page can be time-travelled and non-destructively restored.
    """

    __tablename__ = "note_versions"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    edited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class NoteTemplate(BaseModel):
    """A reusable page template (org-scoped, optionally project-scoped) — COS-245.

    Stores a starter title + content prefilled into the editor when a new page is
    created from it.
    """

    __tablename__ = "note_templates"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class PublicPageComment(BaseModel):
    """An anonymous comment on a publicly-published page (COS-124)."""

    __tablename__ = "public_page_comments"

    note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), index=True
    )
    author_name: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    reported: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
