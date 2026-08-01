"""Saved task view schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ViewScope = Literal["personal", "team", "teamspace"]


class TaskViewIn(BaseModel):
    """Payload to save a named view."""

    name: str = Field(min_length=1, max_length=200)
    config: dict[str, object] = Field(default_factory=dict)
    scope: ViewScope = "personal"
    team_id: uuid.UUID | None = None
    is_default: bool = False

    @model_validator(mode="after")
    def _teamspace_requires_team(self) -> "TaskViewIn":
        if self.scope == "teamspace" and self.team_id is None:
            raise ValueError("A teamspace view requires a team_id")
        return self


class TaskViewUpdateIn(BaseModel):
    """Editable view fields; only provided keys are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    config: dict[str, object] | None = None
    is_default: bool | None = None


class TaskViewOut(BaseModel):
    """Serialized view with a derived scope."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    config: dict[str, object]
    scope: ViewScope
    team_id: uuid.UUID | None
    is_default: bool
    owner_id: uuid.UUID | None
    created_at: datetime


class PublicViewTask(BaseModel):
    """A minimal, safe read-only task row for a published view (COS-167)."""

    identifier: str
    title: str
    status: str
    priority: str


class PublicViewOut(BaseModel):
    """A published view's read-only snapshot."""

    name: str
    tasks: list[PublicViewTask]


class PublishOut(BaseModel):
    """The public token + link path of a published view."""

    public_token: str
    path: str
