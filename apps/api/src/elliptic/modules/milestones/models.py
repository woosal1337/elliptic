"""Milestone models — date-anchored delivery checkpoints within a project."""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class MilestoneStatus(enum.StrEnum):
    """Lifecycle state of a milestone."""

    UPCOMING = "upcoming"
    COMPLETED = "completed"


class Milestone(BaseModel):
    """A date-anchored delivery checkpoint that work items can be linked to."""

    __tablename__ = "milestones"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[MilestoneStatus] = mapped_column(
        Enum(MilestoneStatus, native_enum=False, length=20), default=MilestoneStatus.UPCOMING
    )
