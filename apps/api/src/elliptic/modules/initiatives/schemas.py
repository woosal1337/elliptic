"""Initiative schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.initiatives.models import InitiativeStatus
from elliptic.modules.projects.models import ProjectHealth


class InitiativeCreateIn(BaseModel):
    """Payload to create an initiative."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    target_date: date | None = None


class InitiativeUpdateIn(BaseModel):
    """Editable initiative fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    target_date: date | None = None
    status: InitiativeStatus | None = None


class InitiativeUpdateCreateIn(BaseModel):
    """Payload to post an initiative progress update."""

    health: ProjectHealth
    summary: str = Field(min_length=1, max_length=4000)


class InitiativeUpdateOut(BaseModel):
    """Serialized initiative progress update."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    initiative_id: uuid.UUID
    health: ProjectHealth
    summary: str
    created_by: uuid.UUID | None
    created_at: datetime


class InitiativeProjectOut(BaseModel):
    """A project linked to an initiative, with its progress rollup."""

    id: uuid.UUID
    name: str
    key: str
    task_total: int = 0
    task_done: int = 0


class InitiativeOut(BaseModel):
    """Serialized initiative with project + progress rollups."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    description: str | None
    target_date: date | None
    status: InitiativeStatus
    project_count: int = 0
    task_total: int = 0
    task_done: int = 0
    task_started: int = 0
    task_todo: int = 0
    weighted_total: float = 0.0
    weighted_done: float = 0.0
    created_at: datetime
