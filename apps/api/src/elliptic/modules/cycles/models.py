"""Cycle (sprint) models — time-boxed iterations within a project."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class CycleStatus(enum.StrEnum):
    """Lifecycle state of a cycle."""

    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"


class Cycle(BaseModel):
    """A time-boxed iteration (sprint) that work items can be assigned to."""

    __tablename__ = "cycles"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[CycleStatus] = mapped_column(
        Enum(CycleStatus, native_enum=False, length=20), default=CycleStatus.UPCOMING
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    final_total_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_completed_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
