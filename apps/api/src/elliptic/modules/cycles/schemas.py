"""Cycle schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.cycles.models import CycleStatus


class CycleCreateIn(BaseModel):
    """Payload to create a cycle."""

    name: str = Field(min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None


class CycleUpdateIn(BaseModel):
    """Editable cycle fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    milestone_id: uuid.UUID | None = None
    clear_milestone: bool = False


class CycleTransferIn(BaseModel):
    """Transfer incomplete tasks from this cycle to another."""

    target_cycle_id: uuid.UUID


class CycleTransferOut(BaseModel):
    """Result of a cycle transfer."""

    moved: int


class CycleOut(BaseModel):
    """Serialized cycle with rolled-up task counts."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    start_date: date | None
    end_date: date | None
    milestone_id: uuid.UUID | None = None
    status: CycleStatus
    started_at: datetime | None
    completed_at: datetime | None
    task_total: int = 0
    task_done: int = 0
    started: int = 0
    todo: int = 0
    final_total_count: int | None = None
    final_completed_count: int | None = None
    created_at: datetime


class ActiveCycleOut(CycleOut):
    """An active cycle plus its project context, for the workspace dashboard."""

    project_name: str = ""
    project_key: str = ""


class CycleVelocityPoint(BaseModel):
    """One completed cycle's frozen velocity."""

    id: uuid.UUID
    name: str
    completed_at: datetime | None
    completed: int
    total: int


class CycleVelocityOut(BaseModel):
    """Velocity series across a project's completed cycles + a rolling average."""

    cycles: list[CycleVelocityPoint]
    average_velocity: float
    cycle_count: int


class RecurringCyclesIn(BaseModel):
    """Config to auto-generate a series of future cycles (COS-85)."""

    base_title: str = Field(min_length=1, max_length=200)
    count: int = Field(ge=1, le=52)
    duration_weeks: int = Field(default=2, ge=1, le=12)
    cooldown_days: int = Field(default=0, ge=0, le=60)
    start_date: date
    start_index: int = Field(default=1, ge=1)
