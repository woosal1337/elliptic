"""Retrospective / post-mortem model (COS-267)."""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class Retrospective(BaseModel):
    """A retro/post-mortem anchored to a project: what went well, what to
    improve, and action items captured for continuous improvement."""

    __tablename__ = "retrospectives"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    went_well: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_improve: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
