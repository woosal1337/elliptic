"""Team (teamspace) schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LogoProps(BaseModel):
    """Constrained teamspace logo descriptor (icon + colour)."""

    model_config = ConfigDict(extra="forbid")

    icon: str | None = Field(default=None, max_length=64)
    color: str | None = Field(default=None, max_length=40)


class TeamCreateIn(BaseModel):
    """Payload to create a teamspace."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    lead_id: uuid.UUID | None = None
    charter: str | None = None
    logo_props: LogoProps | None = None


class TeamUpdateIn(BaseModel):
    """Editable teamspace fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    lead_id: uuid.UUID | None = None
    charter: str | None = None
    logo_props: LogoProps | None = None


class TeamProjectLinkIn(BaseModel):
    """Bulk link/unlink a teamspace's projects."""

    project_ids: list[uuid.UUID] = Field(min_length=1)


class TeamOut(BaseModel):
    """Serialized teamspace."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    description: str | None
    lead_id: uuid.UUID | None
    charter: str | None
    logo_props: dict[str, str]
    created_at: datetime


class TeamStatsOut(BaseModel):
    """A team's rolled-up portfolio progress."""

    project_count: int
    task_total: int
    task_done: int
    overdue: int


class TeamMemberIn(BaseModel):
    """Payload to add an org member to a team."""

    user_id: uuid.UUID


class TeamMemberOut(BaseModel):
    """Serialized team membership."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
