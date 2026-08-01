"""Workflow status records owned by an org or one of its teams."""

import enum
import uuid

from sqlalchemy import (
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    false,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel
from elliptic.modules.projects.models import ProjectRole
from elliptic.modules.tasks.models import StatusCategory, TaskKind


class WorkflowStatus(BaseModel):
    """A renameable status that lives inside one fixed, immutable category.

    Teams rename, recolor, and reorder statuses within a category, and may add
    statuses (e.g. ``In QA`` in the started band), but can never change the
    category itself — categories stay stable for analytics and AI. A status with
    a null ``team_id`` is the org-level default workflow; a team row overrides it.
    """

    __tablename__ = "workflow_statuses"
    __table_args__ = (UniqueConstraint("org_id", "team_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[StatusCategory] = mapped_column(
        Enum(StatusCategory, native_enum=False, length=20)
    )
    color: Mapped[str] = mapped_column(String(40), default="muted-foreground")
    position: Mapped[float] = mapped_column(Float, default=0.0)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    allow_new_items: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())


class WorkflowTransition(BaseModel):
    """An allowed transition between two workflow statuses (guardrail engine).

    If no transitions are defined from a given source status, all moves out of it
    are allowed (open by default). Once any transition from a source status
    exists, only the explicitly listed targets are permitted.
    """

    __tablename__ = "workflow_transitions"
    __table_args__ = (
        Index(
            "uq_workflow_transitions_rule",
            "org_id",
            "from_status_id",
            "to_status_id",
            "kind",
            unique=True,
            postgresql_nulls_not_distinct=True,
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    from_status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"), index=True
    )
    to_status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[TaskKind | None] = mapped_column(
        Enum(TaskKind, native_enum=False, length=20), nullable=True
    )
    required_role: Mapped[ProjectRole | None] = mapped_column(
        Enum(ProjectRole, native_enum=False, length=20), nullable=True
    )


class ConditionType(enum.StrEnum):
    """Declarative pre-validation conditions gating a transition (COS-220)."""

    REQUIRE_ASSIGNEE = "require_assignee"
    REQUIRE_ESTIMATE = "require_estimate"
    REQUIRE_DUE_DATE = "require_due_date"
    REQUIRE_DOD_COMPLETE = "require_dod_complete"


class TransitionCondition(BaseModel):
    """An ordered, blocking pre-validation hook on a status transition (COS-220).

    Conditions attach to a (from_status, to_status) pair; if any fails, the move
    is blocked with a reason. Declarative rather than a scripting runner.
    """

    __tablename__ = "transition_conditions"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    from_status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"), index=True
    )
    to_status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"), index=True
    )
    condition: Mapped[ConditionType] = mapped_column(
        Enum(ConditionType, native_enum=False, length=40)
    )
    position: Mapped[float] = mapped_column(Float, default=0.0)
