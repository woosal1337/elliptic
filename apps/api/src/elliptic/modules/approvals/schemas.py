"""Task approval schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.approvals.models import ApprovalState
from elliptic.modules.tasks.models import TaskStatus


class ApprovalRequestIn(BaseModel):
    """Request approval to move a task to a target status."""

    target_status: TaskStatus
    note: str | None = Field(default=None, max_length=2000)


class ApprovalDecisionIn(BaseModel):
    """Approver's optional note on a decision."""

    note: str | None = Field(default=None, max_length=2000)


class ApprovalOut(BaseModel):
    """Serialized approval request."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    target_status: TaskStatus
    state: ApprovalState
    note: str | None
    requested_by: uuid.UUID | None
    decided_by: uuid.UUID | None
    created_at: datetime
