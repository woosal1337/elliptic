"""Task approval model — gate a status change behind an approve/reject decision."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel
from elliptic.modules.tasks.models import TaskStatus


class ApprovalState(enum.StrEnum):
    """Lifecycle of an approval request."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class TaskApproval(BaseModel):
    """A request to move a work item to a target status, pending an approver."""

    __tablename__ = "task_approvals"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    target_status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, native_enum=False, length=20)
    )
    state: Mapped[ApprovalState] = mapped_column(
        Enum(ApprovalState, native_enum=False, length=20), default=ApprovalState.PENDING
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
