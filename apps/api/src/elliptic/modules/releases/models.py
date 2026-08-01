"""Release models — workspace-level versioned deliverables."""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class ReleaseStatus(enum.StrEnum):
    """Lifecycle state of a release."""

    PLANNED = "planned"
    RELEASED = "released"
    ARCHIVED = "archived"


class ChangelogCategory(enum.StrEnum):
    """Keep-a-Changelog style entry categories (COS-269)."""

    ADDED = "added"
    CHANGED = "changed"
    FIXED = "fixed"
    REMOVED = "removed"
    SECURITY = "security"
    DEPRECATED = "deprecated"


class ChangelogEntry(BaseModel):
    """A categorized, optionally PR-linked changelog line under a release (COS-269)."""

    __tablename__ = "changelog_entries"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    release_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("releases.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[ChangelogCategory] = mapped_column(
        Enum(ChangelogCategory, native_enum=False, length=20),
        default=ChangelogCategory.ADDED,
        server_default=ChangelogCategory.ADDED.name,
    )
    title: Mapped[str] = mapped_column(String(500))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    pr_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0)


class Release(BaseModel):
    """An org-level versioned deliverable that work items can be tagged into."""

    __tablename__ = "releases"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    changelog: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ReleaseStatus] = mapped_column(
        Enum(ReleaseStatus, native_enum=False, length=20), default=ReleaseStatus.PLANNED
    )
    released_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
