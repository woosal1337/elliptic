"""Project schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.projects.models import (
    ProjectNetwork,
    ProjectRole,
    ProjectStateGroup,
    ProjectStatus,
)
from elliptic.modules.tasks.models import TaskStatus


class ProjectCreateIn(BaseModel):
    """Payload to create a project."""

    name: str = Field(min_length=1, max_length=255)
    key: str = Field(pattern=r"^[A-Z]{2,6}$")
    description: str | None = None
    team_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    target_date: date | None = None
    network: ProjectNetwork | None = None


class ProjectUpdateIn(BaseModel):
    """Editable project fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    icon: str | None = Field(default=None, max_length=16)
    status: ProjectStatus | None = None
    network: ProjectNetwork | None = None
    team_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    default_assignee_id: uuid.UUID | None = None
    target_date: date | None = None
    features: dict[str, bool] | None = None
    estimate_scale: list[str] | None = None
    labels: list[str] | None = None
    auto_archive_days: int | None = Field(default=None, ge=1, le=3650)
    clear_auto_archive: bool = False
    auto_close_days: int | None = Field(default=None, ge=1, le=3650)
    auto_close_status: TaskStatus | None = None
    clear_auto_close: bool = False
    state_id: uuid.UUID | None = None
    clear_state: bool = False
    worklog_approval_required: bool | None = None


class ProjectOut(BaseModel):
    """Serialized project."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    team_id: uuid.UUID | None
    name: str
    key: str
    icon: str | None = None
    description: str | None
    status: ProjectStatus
    network: ProjectNetwork = ProjectNetwork.PRIVATE
    lead_id: uuid.UUID | None = None
    default_assignee_id: uuid.UUID | None = None
    worklog_approval_required: bool = False
    target_date: date | None = None
    state_id: uuid.UUID | None = None
    features: dict[str, bool] = {}
    estimate_scale: list[str] = []
    labels: list[str] = []
    auto_archive_days: int | None = None
    auto_close_days: int | None = None
    auto_close_status: TaskStatus | None = None
    deleted_at: datetime | None = None
    created_at: datetime


class ProjectBrowseOut(BaseModel):
    """A discoverable public project, for the join directory."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    key: str
    icon: str | None = None
    description: str | None = None
    network: ProjectNetwork
    lead_id: uuid.UUID | None = None
    member_count: int = 0
    is_member: bool = False


class ProjectArtifactIn(BaseModel):
    """Payload to add a linked artifact to a project."""

    label: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2000)


class ProjectArtifactOut(BaseModel):
    """Serialized project artifact."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    label: str
    url: str
    created_at: datetime


class SubscriptionStateOut(BaseModel):
    """Whether the current user is subscribed to a stream."""

    subscribed: bool


class ProjectMemberIn(BaseModel):
    """Payload to assign an org member to a project."""

    user_id: uuid.UUID
    role: ProjectRole = ProjectRole.MEMBER


class ProjectMemberRoleIn(BaseModel):
    """Change a project member's role."""

    role: ProjectRole


class ProjectMemberOut(BaseModel):
    """Serialized project membership."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: ProjectRole = ProjectRole.MEMBER
    created_at: datetime


class SaveTemplateIn(BaseModel):
    """Save a project's config as a reusable template."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class InstantiateTemplateIn(BaseModel):
    """Create a new project from a template."""

    name: str = Field(min_length=1, max_length=255)
    key: str = Field(pattern=r"^[A-Z]{2,6}$")


class ProjectTemplateOut(BaseModel):
    """Serialized project template."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    config: dict[str, object]
    created_at: datetime


class ProjectStateIn(BaseModel):
    """Create a portfolio project state."""

    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#94a3b8", max_length=16)
    group: ProjectStateGroup = ProjectStateGroup.DRAFT


class ProjectStateUpdateIn(BaseModel):
    """Edit a portfolio project state."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=16)
    group: ProjectStateGroup | None = None
    sort_order: int | None = None


class ProjectStateOut(BaseModel):
    """Serialized portfolio project state."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str
    group: ProjectStateGroup
    sort_order: int


class PublishBoardIn(BaseModel):
    """Publish a project board with a whitelist of visible attributes (COS-249)."""

    attributes: list[str] = Field(default_factory=list)


class PublishBoardOut(BaseModel):
    """The public board token + visible attributes."""

    public_token: str
    path: str
    attributes: list[str]


class PublicBoardColumn(BaseModel):
    status: str
    category: str
    tasks: list[dict[str, object]]


class PublicBoardOut(BaseModel):
    """A published project board for anonymous viewers."""

    name: str
    key: str
    description: str | None = None
    attributes: list[str]
    columns: list[PublicBoardColumn]
