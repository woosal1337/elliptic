"""Project and project membership models."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class ProjectStatus(enum.StrEnum):
    """Lifecycle status of a project."""

    ACTIVE = "active"
    ARCHIVED = "archived"


class ProjectStateGroup(enum.StrEnum):
    """Fixed groups that customizable portfolio project-states roll up into."""

    DRAFT = "draft"
    PLANNING = "planning"
    EXECUTION = "execution"
    MONITORING = "monitoring"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


DEFAULT_PROJECT_STATES: tuple[tuple[ProjectStateGroup, str, str], ...] = (
    (ProjectStateGroup.DRAFT, "Draft", "#94a3b8"),
    (ProjectStateGroup.PLANNING, "Planning", "#6366f1"),
    (ProjectStateGroup.EXECUTION, "Execution", "#0891b2"),
    (ProjectStateGroup.MONITORING, "Monitoring", "#d97706"),
    (ProjectStateGroup.COMPLETED, "Completed", "#15803d"),
    (ProjectStateGroup.CANCELLED, "Cancelled", "#be123c"),
)


class ProjectNetwork(enum.StrEnum):
    """Project visibility: who may discover and join it."""

    PRIVATE = "private"
    PUBLIC = "public"


class Project(BaseModel):
    """A project within an organization, optionally owned by a team."""

    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("org_id", "key"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255))
    key: Mapped[str] = mapped_column(String(6))
    icon: Mapped[str | None] = mapped_column(String(16), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, native_enum=False, length=20), default=ProjectStatus.ACTIVE
    )
    network: Mapped[ProjectNetwork] = mapped_column(
        Enum(ProjectNetwork, native_enum=False, length=20),
        default=ProjectNetwork.PRIVATE,
        server_default=ProjectNetwork.PRIVATE.name,
    )
    task_counter: Mapped[int] = mapped_column(Integer, default=0)
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    default_assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    worklog_approval_required: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false()
    )
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    state_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("project_states.id", ondelete="SET NULL"), nullable=True, index=True
    )
    auto_archive_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    auto_close_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    auto_close_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    features: Mapped[dict[str, bool]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    estimate_scale: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    labels: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    public_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    public_attributes: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProjectArtifact(BaseModel):
    """A linked external artifact on a project's living brief (Figma, Docs, PR…)."""

    __tablename__ = "project_artifacts"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(2000))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ProjectRole(enum.StrEnum):
    """Project-level role, the second axis alongside the workspace OrgRole."""

    ADMIN = "admin"
    MEMBER = "member"
    COMMENTER = "commenter"
    VIEWER = "viewer"


PROJECT_ROLE_RANK: dict[ProjectRole, int] = {
    ProjectRole.VIEWER: 0,
    ProjectRole.COMMENTER: 1,
    ProjectRole.MEMBER: 2,
    ProjectRole.ADMIN: 3,
}

GUEST_ALLOWED_PROJECT_ROLES: set[ProjectRole] = {ProjectRole.VIEWER, ProjectRole.COMMENTER}


class ProjectMember(BaseModel):
    """Assignment of an org member to a project."""

    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole, native_enum=False, length=20),
        default=ProjectRole.MEMBER,
        server_default=ProjectRole.MEMBER.name,
    )
    source: Mapped[str] = mapped_column(String(20), default="manual", server_default="manual")


class ProjectSubscription(BaseModel):
    """An opt-in marker that a user wants this project's notification stream."""

    __tablename__ = "project_subscriptions"
    __table_args__ = (UniqueConstraint("project_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )


class ProjectHealth(enum.StrEnum):
    """RAG health status of a project update."""

    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"


class ProjectTemplate(BaseModel):
    """A reusable snapshot of a project's config that instantiates a ready-to-run project.

    ``config`` is a JSON snapshot: network, feature flags, estimate scale, labels,
    and seed work items (title/status/priority/kind).
    """

    __tablename__ = "project_templates"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ProjectState(BaseModel):
    """An org-scoped, customizable portfolio lifecycle state for projects (COS-240)."""

    __tablename__ = "project_states"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(16), default="#94a3b8")
    group: Mapped[ProjectStateGroup] = mapped_column(
        Enum(ProjectStateGroup, native_enum=False, length=20),
        default=ProjectStateGroup.DRAFT,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
