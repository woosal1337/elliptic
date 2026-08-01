"""Retrospective schemas (COS-267)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RetrospectiveCreateIn(BaseModel):
    """Create a retrospective."""

    title: str = Field(min_length=1, max_length=255)
    cycle_id: uuid.UUID | None = None
    went_well: str | None = None
    to_improve: str | None = None
    action_items: str | None = None


class RetrospectiveUpdateIn(BaseModel):
    """Edit a retrospective."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    cycle_id: uuid.UUID | None = None
    clear_cycle: bool = False
    went_well: str | None = None
    to_improve: str | None = None
    action_items: str | None = None


class RetrospectiveOut(BaseModel):
    """Serialized retrospective."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    cycle_id: uuid.UUID | None
    title: str
    went_well: str | None
    to_improve: str | None
    action_items: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
