"""Recurring work item schemas (COS-143)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.tasks.models import TaskKind, TaskPriority


class RecurringTaskCreateIn(BaseModel):
    """Create a recurring work item rule."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    priority: TaskPriority = TaskPriority.NONE
    kind: TaskKind = TaskKind.TASK
    assignee_id: uuid.UUID | None = None
    interval_days: int = Field(ge=1, le=365)
    starts_at: datetime | None = None


class RecurringTaskUpdateIn(BaseModel):
    """Edit a recurring rule."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    priority: TaskPriority | None = None
    kind: TaskKind | None = None
    assignee_id: uuid.UUID | None = None
    clear_assignee: bool = False
    interval_days: int | None = Field(default=None, ge=1, le=365)
    next_run_at: datetime | None = None
    active: bool | None = None


class RecurringTaskOut(BaseModel):
    """Serialized recurring rule."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None
    priority: TaskPriority
    kind: TaskKind
    assignee_id: uuid.UUID | None
    interval_days: int
    next_run_at: datetime
    last_run_at: datetime | None
    active: bool
