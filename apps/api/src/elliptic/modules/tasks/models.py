"""Linear-style task and label models."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    false,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from elliptic.core.models_base import Base, BaseModel
from elliptic.modules.projects.models import ProjectHealth


class TaskStatus(enum.StrEnum):
    """Workflow status of a task."""

    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    CANCELLED = "cancelled"
    DUPLICATE = "duplicate"


class StatusCategory(enum.StrEnum):
    """Immutable semantic band a status belongs to.

    Categories are fixed in code and never editable through the API. They are
    the stable spine that progress math, Focus ordering, and AI summaries read
    regardless of how a team renames its statuses.
    """

    BACKLOG = "backlog"
    UNSTARTED = "unstarted"
    STARTED = "started"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


STATUS_TO_CATEGORY: dict[TaskStatus, StatusCategory] = {
    TaskStatus.BACKLOG: StatusCategory.BACKLOG,
    TaskStatus.TODO: StatusCategory.UNSTARTED,
    TaskStatus.IN_PROGRESS: StatusCategory.STARTED,
    TaskStatus.IN_REVIEW: StatusCategory.STARTED,
    TaskStatus.DONE: StatusCategory.COMPLETED,
    TaskStatus.CANCELLED: StatusCategory.CANCELLED,
    TaskStatus.DUPLICATE: StatusCategory.CANCELLED,
}

CATEGORY_RANK: dict[StatusCategory, int] = {
    StatusCategory.BACKLOG: 0,
    StatusCategory.UNSTARTED: 1,
    StatusCategory.STARTED: 2,
    StatusCategory.COMPLETED: 3,
    StatusCategory.CANCELLED: 4,
}

PROGRESS_EXCLUDED_STATUSES: frozenset[TaskStatus] = frozenset(
    status
    for status, category in STATUS_TO_CATEGORY.items()
    if category is StatusCategory.CANCELLED
)

BOARD_STATUSES: tuple[TaskStatus, ...] = tuple(
    status for status in TaskStatus if status is not TaskStatus.DUPLICATE
)


def status_category(status: TaskStatus) -> StatusCategory:
    """Return the immutable category a task status maps to."""
    return STATUS_TO_CATEGORY[status]


class TaskPriority(enum.StrEnum):
    """Priority of a task."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskKind(enum.StrEnum):
    """The work-item type: ordinary task, bug, user story, or epic."""

    TASK = "task"
    BUG = "bug"
    STORY = "story"
    EPIC = "epic"


class BugSeverity(enum.StrEnum):
    """Severity band of a bug, used to derive an SLA due date."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskRelationType(enum.StrEnum):
    """Stored direction of a relation between two tasks.

    Only canonical directions are persisted: BLOCKS (source blocks target,
    so target is blocked_by source) and RELATED (symmetric). The blocked_by
    view is derived by reversing BLOCKS rows.
    """

    BLOCKS = "blocks"
    RELATED = "related"
    DUPLICATE = "duplicate"
    IMPLEMENTS = "implements"
    CUSTOM = "custom"


task_labels = Table(
    "task_labels",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    Column(
        "label_id", ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True, nullable=False
    ),
)


class Label(BaseModel):
    """An org-scoped label with a display color."""

    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(7), default="#808080")


class Task(BaseModel):
    """A task within a project, numbered per project."""

    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("project_id", "number"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, native_enum=False, length=20), default=TaskStatus.BACKLOG, index=True
    )
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, native_enum=False, length=20), default=TaskPriority.NONE
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    bot_assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    parent_task_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True
    )
    source_meeting_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_note_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("notes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    cycle_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("cycles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    module_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("modules.id", ondelete="SET NULL"), nullable=True, index=True
    )
    release_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("releases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    workflow_status_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workflow_statuses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    custom_fields: Mapped[dict[str, str]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    dod_items: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    acceptance_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    kind: Mapped[TaskKind] = mapped_column(
        Enum(TaskKind, native_enum=False, length=20), default=TaskKind.TASK, index=True
    )
    severity: Mapped[BugSeverity | None] = mapped_column(
        Enum(BugSeverity, native_enum=False, length=20), nullable=True
    )
    component: Mapped[str | None] = mapped_column(String(100), nullable=True)
    release_blocker: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_triage: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), index=True
    )
    triage_resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    intake_channel: Mapped[str | None] = mapped_column(String(20), nullable=True)
    external_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    snoozed_till: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    labels: Mapped[list[Label]] = relationship(secondary=task_labels, lazy="selectin")


class NotDuplicatePair(BaseModel):
    """A task pair a human dismissed as not-duplicate, to suppress future suggestions (COS-242)."""

    __tablename__ = "not_duplicate_pairs"
    __table_args__ = (UniqueConstraint("org_id", "task_a_id", "task_b_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    task_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))


class RelationTypeDef(BaseModel):
    """An org-defined directional relation type with inward/outward labels (COS-53)."""

    __tablename__ = "relation_type_defs"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(60))
    outward_label: Mapped[str] = mapped_column(String(60))
    inward_label: Mapped[str] = mapped_column(String(60))


class TaskRelation(BaseModel):
    """A directed dependency or association between two tasks."""

    __tablename__ = "task_relations"
    __table_args__ = (
        Index(
            "uq_task_relations_pair",
            "source_task_id",
            "target_task_id",
            "type",
            "custom_type_id",
            unique=True,
            postgresql_nulls_not_distinct=True,
        ),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    source_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    target_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[TaskRelationType] = mapped_column(
        Enum(TaskRelationType, native_enum=False, length=20)
    )
    custom_type_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("relation_type_defs.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class TaskSubscription(BaseModel):
    """A user watching a task, feeding the Watching tab and the inbox."""

    __tablename__ = "task_subscriptions"
    __table_args__ = (UniqueConstraint("task_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )


class TaskLink(BaseModel):
    """An external URL reference attached to a task."""

    __tablename__ = "task_links"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(2000))
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class WorkItemTemplate(BaseModel):
    """A reusable scaffold that pre-populates fields when creating a work item."""

    __tablename__ = "work_item_templates"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, native_enum=False, length=20), default=TaskPriority.NONE
    )
    kind: Mapped[TaskKind] = mapped_column(
        Enum(TaskKind, native_enum=False, length=20), default=TaskKind.TASK
    )


class WorkItemUpdate(BaseModel):
    """A posted progress update on a work item, with a RAG health and summary."""

    __tablename__ = "work_item_updates"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    health: Mapped[ProjectHealth] = mapped_column(Enum(ProjectHealth, native_enum=False, length=20))
    summary: Mapped[str] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class TaskNoteLink(BaseModel):
    """A structured link between a work item and a note/page (bidirectional)."""

    __tablename__ = "task_note_links"
    __table_args__ = (UniqueConstraint("task_id", "note_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), index=True
    )


class TaskDescriptionVersion(BaseModel):
    """An immutable snapshot of a task's description before an edit (COS-148).

    Captured on each description change, attributed to the editor, so the
    description can be reviewed and non-destructively restored.
    """

    __tablename__ = "task_description_versions"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    edited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


DEFAULT_TYPE_LEVELS: dict["TaskKind", int] = {
    TaskKind.EPIC: 3,
    TaskKind.STORY: 2,
    TaskKind.TASK: 1,
    TaskKind.BUG: 1,
}


class WorkItemTypeLevel(BaseModel):
    """Org-scoped hierarchy level for a work-item type (COS-71).

    A child may not nest under a parent of a strictly lower level (no inversions);
    same-level nesting (e.g. task under task) stays allowed.
    """

    __tablename__ = "work_item_type_levels"
    __table_args__ = (UniqueConstraint("org_id", "kind"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[TaskKind] = mapped_column(Enum(TaskKind, native_enum=False, length=20))
    level: Mapped[int] = mapped_column(Integer)


class ScheduleDependencyType(enum.StrEnum):
    """Scheduling constraint types that drive the timeline (COS-68)."""

    FINISH_TO_START = "finish_to_start"
    START_TO_START = "start_to_start"
    FINISH_TO_FINISH = "finish_to_finish"
    START_TO_FINISH = "start_to_finish"


class TaskScheduleLink(BaseModel):
    """A date-constraining scheduling dependency between two tasks (COS-68).

    Distinct from logical TaskRelation: this drives the Timeline/Gantt by
    constraining the successor's dates relative to the predecessor's.
    """

    __tablename__ = "task_schedule_links"
    __table_args__ = (UniqueConstraint("predecessor_id", "successor_id", "dependency_type"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    predecessor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    successor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    dependency_type: Mapped[ScheduleDependencyType] = mapped_column(
        Enum(ScheduleDependencyType, native_enum=False, length=20),
        default=ScheduleDependencyType.FINISH_TO_START,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
