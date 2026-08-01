"""Worklog model — time logged against a work item."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class WorklogApprovalState(enum.StrEnum):
    """Approval state of a logged time entry (COS-185)."""

    APPROVED = "approved"
    PENDING = "pending"
    REJECTED = "rejected"


class Worklog(BaseModel):
    """A unit of time (minutes) a user logged against a task."""

    __tablename__ = "worklogs"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    minutes: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[date] = mapped_column(Date)
    user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approval_status: Mapped[WorklogApprovalState] = mapped_column(
        Enum(WorklogApprovalState, native_enum=False, length=20),
        default=WorklogApprovalState.APPROVED,
        server_default=WorklogApprovalState.APPROVED.name,
    )
    approver_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
