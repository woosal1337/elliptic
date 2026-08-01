"""Worklog schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.worklogs.models import WorklogApprovalState


class WorklogCreateIn(BaseModel):
    """Payload to log time against a task."""

    minutes: int = Field(gt=0, le=60 * 24)
    note: str | None = Field(default=None, max_length=2000)
    logged_at: date | None = None


class WorklogOut(BaseModel):
    """A logged time entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None
    minutes: int
    note: str | None
    logged_at: date
    approval_status: WorklogApprovalState = WorklogApprovalState.APPROVED
    approver_id: uuid.UUID | None = None
    decided_at: datetime | None = None
    decision_note: str | None = None
    created_at: datetime


class WorklogDecisionIn(BaseModel):
    """Approve/reject decision note on a pending worklog."""

    note: str | None = Field(default=None, max_length=2000)


class WorklogListOut(BaseModel):
    """A task's worklog entries plus the total minutes."""

    entries: list[WorklogOut]
    total_minutes: int = 0
