"""Milestone schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.milestones.models import MilestoneStatus


class MilestoneTaskBulkIn(BaseModel):
    """Link many work items to a milestone at once."""

    task_ids: list[uuid.UUID] = Field(min_length=1, max_length=200)


class MilestoneLinkResult(BaseModel):
    """Per-target outcome of a bulk milestone link."""

    task_id: uuid.UUID
    status: str


class MilestoneCreateIn(BaseModel):
    """Payload to create a milestone."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    target_date: date | None = None


class MilestoneUpdateIn(BaseModel):
    """Editable milestone fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    target_date: date | None = None
    status: MilestoneStatus | None = None


class MilestoneOut(BaseModel):
    """Serialized milestone with rolled-up task counts."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    target_date: date | None
    status: MilestoneStatus
    task_total: int = 0
    task_done: int = 0
    created_at: datetime
