"""Module schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.modules.models import ModuleStatus


class ModuleCreateIn(BaseModel):
    """Payload to create a module."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    lead_id: uuid.UUID | None = None
    start_date: date | None = None
    target_date: date | None = None


class ModuleUpdateIn(BaseModel):
    """Editable module fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    lead_id: uuid.UUID | None = None
    clear_lead: bool = False
    start_date: date | None = None
    target_date: date | None = None
    status: ModuleStatus | None = None
    milestone_id: uuid.UUID | None = None
    clear_milestone: bool = False


class ModuleOut(BaseModel):
    """Serialized module with rolled-up task counts."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    lead_id: uuid.UUID | None
    start_date: date | None
    target_date: date | None
    status: ModuleStatus
    milestone_id: uuid.UUID | None = None
    task_total: int = 0
    task_done: int = 0
    task_started: int = 0
    task_todo: int = 0
    archived_at: datetime | None = None
    created_at: datetime
