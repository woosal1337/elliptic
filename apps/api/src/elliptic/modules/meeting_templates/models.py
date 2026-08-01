"""Custom meeting structure template model."""

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class MeetingTemplate(BaseModel):
    """An org's custom meeting-summary structure: ordered sections + optional scaffold.

    Built-in templates (One-on-One, Stand-up, ...) live in code; only org-authored
    custom templates are persisted here.
    """

    __tablename__ = "meeting_templates"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    sections: Mapped[list[str]] = mapped_column(JSONB, default=list)
    prompt_scaffold: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class MeetingRecipe(BaseModel):
    """A saved post-meeting prompt an org can re-run against a meeting.

    Built-in recipes (create tasks, draft Slack summary, ...) live in code; only
    org-authored custom recipes are persisted here.
    """

    __tablename__ = "meeting_recipes"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    prompt: Mapped[str] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
