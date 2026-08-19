"""Task and label schemas."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.projects.models import ProjectHealth
from elliptic.modules.properties.schemas import CustomPropertyOut
from elliptic.modules.tasks.models import (
    BugSeverity,
    StatusCategory,
    TaskKind,
    TaskPriority,
    TaskRelationType,
    TaskStatus,
)


class DodItem(BaseModel):
    """One Definition-of-Done checklist item."""

    text: str = Field(min_length=1, max_length=500)
    done: bool = False


class LabelCreateIn(BaseModel):
    """Payload to create an org-scoped label."""

    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#808080", pattern=r"^#[0-9a-fA-F]{6}$")


class LabelOut(BaseModel):
    """Serialized label."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str


class TaskCreateIn(BaseModel):
    """Payload to create a task."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus = TaskStatus.BACKLOG
    priority: TaskPriority = TaskPriority.NONE
    assignee_id: uuid.UUID | None = None
    unassigned: bool = False
    start_date: date | None = None
    due_date: date | None = None
    label_ids: list[uuid.UUID] = Field(default_factory=list)
    parent_task_id: uuid.UUID | None = None
    source_meeting_id: uuid.UUID | None = None
    source_note_id: uuid.UUID | None = None
    kind: TaskKind = TaskKind.TASK
    severity: BugSeverity | None = None
    component: str | None = Field(default=None, max_length=100)
    external_source: str | None = Field(default=None, max_length=50)
    external_id: str | None = Field(default=None, max_length=255)
    mention_user_ids: list[uuid.UUID] = Field(default_factory=list)
    related_task_ids: list[uuid.UUID] = Field(default_factory=list)


class TaskUpdateIn(BaseModel):
    """Editable task fields."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    priority: TaskPriority | None = None
    assignee_id: uuid.UUID | None = None
    clear_assignee: bool = False
    start_date: date | None = None
    due_date: date | None = None
    sort_order: float | None = None
    label_ids: list[uuid.UUID] | None = None
    kind: TaskKind | None = None
    severity: BugSeverity | None = None
    clear_severity: bool = False
    component: str | None = Field(default=None, max_length=100)
    clear_component: bool = False
    custom_fields: dict[str, str] | None = None
    dod_items: list[DodItem] | None = None
    acceptance_criteria: str | None = None
    estimate: str | None = Field(default=None, max_length=20)
    mention_user_ids: list[uuid.UUID] = Field(default_factory=list)
    related_task_ids: list[uuid.UUID] = Field(default_factory=list)


class TaskBatchCreateIn(BaseModel):
    """Create several tasks from text lines, sharing provenance (NOTE-02)."""

    titles: list[str] = Field(min_length=1)
    source_note_id: uuid.UUID | None = None
    source_meeting_id: uuid.UUID | None = None


class TaskStatusIn(BaseModel):
    """Payload for a status transition."""

    status: TaskStatus


class TaskConvertIn(BaseModel):
    """Payload to convert a work item to a different type."""

    kind: TaskKind


class TaskDuplicateIn(BaseModel):
    """Optional target project for a duplicated work item (defaults to the same project)."""

    target_project_id: uuid.UUID | None = None


class TaskArchiveIn(BaseModel):
    """Payload to archive or restore a task."""

    archived: bool


class TaskRelationIn(BaseModel):
    """Payload to relate the path task to another task."""

    target_task_id: uuid.UUID
    type: TaskRelationType | str = Field(
        default="related",
        description=(
            "blocks | blocked_by | related | duplicate | duplicate_of | implements | "
            "implemented_by; the _by/_of forms are stored as the inverse direction"
        ),
    )
    custom_type_id: uuid.UUID | None = Field(
        default=None, description="A workspace-defined relation type (overrides type)."
    )


class TaskRelationBulkIn(BaseModel):
    """Payload to relate the path task to many targets at once."""

    target_task_ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    type: TaskRelationType | str = Field(
        description="blocks | blocked_by | related | duplicate | implements (+ inverse _by/_of)"
    )


class RelationResult(BaseModel):
    """Per-target outcome of a bulk relation request."""

    target_task_id: uuid.UUID
    status: Literal["created", "exists", "skipped"]


class RelatedTaskOut(BaseModel):
    """One relation as seen from the perspective of the path task."""

    relation_id: uuid.UUID
    task_id: uuid.UUID
    identifier: str
    title: str
    status: TaskStatus
    due_date: date | None = None
    type: str


class LatestCommentOut(BaseModel):
    """The most recent comment on a task, for the board-card context line."""

    content: str
    author_name: str | None = None


class TaskOut(BaseModel):
    """Serialized task with its display identifier."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID
    number: int
    identifier: str
    title: str
    description: str | None
    status: TaskStatus
    category: StatusCategory
    priority: TaskPriority
    assignee_id: uuid.UUID | None
    start_date: date | None = None
    due_date: date | None
    sort_order: float
    labels: list[LabelOut]
    created_by: uuid.UUID | None
    parent_task_id: uuid.UUID | None
    source_meeting_id: uuid.UUID | None
    source_note_id: uuid.UUID | None = None
    workflow_status_id: uuid.UUID | None = None
    custom_fields: dict[str, str] = Field(default_factory=dict)
    dod_items: list[DodItem] = Field(default_factory=list)
    acceptance_criteria: str | None = None
    estimate: str | None = None
    kind: TaskKind
    severity: BugSeverity | None
    component: str | None = None
    external_source: str | None = None
    external_id: str | None = None
    archived_at: datetime | None
    subtask_total: int = 0
    subtask_done: int = 0
    blocked: bool = False
    comment_count: int = 0
    latest_comment: LatestCommentOut | None = None
    created_at: datetime
    updated_at: datetime


class TaskLinkIn(BaseModel):
    """Payload to attach an external link to a task."""

    url: str = Field(min_length=1, max_length=2000)
    title: str | None = Field(default=None, max_length=255)


class TaskLinkOut(BaseModel):
    """Serialized task link."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    url: str
    title: str | None
    created_by: uuid.UUID | None
    created_at: datetime


class NoteLinkOut(BaseModel):
    """A note linked to a work item, with enough detail to render + navigate."""

    note_id: uuid.UUID
    title: str
    project_id: uuid.UUID | None


class WorkItemUpdateCreateIn(BaseModel):
    """Payload to post a work-item progress update."""

    health: ProjectHealth
    summary: str = Field(min_length=1, max_length=4000)


class WorkItemUpdateOut(BaseModel):
    """Serialized work-item progress update."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    health: ProjectHealth
    summary: str
    created_by: uuid.UUID | None
    created_at: datetime


class WorkItemTemplateCreateIn(BaseModel):
    """Payload to define a work-item template."""

    name: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    priority: TaskPriority = TaskPriority.NONE
    kind: TaskKind = TaskKind.TASK


class WorkItemTemplateOut(BaseModel):
    """Serialized work-item template."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    title: str
    description: str | None
    priority: TaskPriority
    kind: TaskKind
    created_at: datetime


class BoardColumn(BaseModel):
    """One status column of the board view."""

    status: TaskStatus
    tasks: list[TaskOut]


class StatusInfo(BaseModel):
    """A workflow status value with its immutable analytics category."""

    value: TaskStatus
    category: StatusCategory


class ThroughputPoint(BaseModel):
    """One day's created vs resolved counts in the throughput trend."""

    date: str
    created: int
    resolved: int


class WorkItemSchemaOut(BaseModel):
    """The full schema agents/UIs need to create or reason about a work item."""

    kinds: list[TaskKind]
    priorities: list[TaskPriority]
    statuses: list[StatusInfo]
    labels: list[LabelOut]
    custom_properties: list[CustomPropertyOut]


class TaskDescriptionVersionOut(BaseModel):
    """A snapshot of a task's description before an edit (COS-148)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    description: str | None
    edited_by: uuid.UUID | None
    created_at: datetime


class TaskTransitionOut(BaseModel):
    """One status transition with the time spent in the prior state (COS-153)."""

    from_status: str | None
    to_status: str | None
    at: str
    actor_id: uuid.UUID | None
    seconds_in_prev: int


class TaskTransitionsOut(BaseModel):
    """A task's status-transition history + current-state dwell time."""

    current_status: str
    seconds_in_current: int
    transitions: list[TaskTransitionOut]


class RelationTypeDefIn(BaseModel):
    """Create a workspace-defined directional relation type (COS-53)."""

    name: str = Field(min_length=1, max_length=60)
    outward_label: str = Field(min_length=1, max_length=60)
    inward_label: str = Field(min_length=1, max_length=60)


class RelationTypeDefOut(BaseModel):
    """Serialized custom relation type."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    outward_label: str
    inward_label: str


class DuplicateCandidateOut(BaseModel):
    """A possible-duplicate task with a similarity score (COS-242)."""

    task_id: uuid.UUID
    title: str
    status: TaskStatus
    score: float
    shared_tokens: int


class TaskImportIn(BaseModel):
    """Import work items from pasted CSV text (COS-270)."""

    content: str = Field(min_length=1, max_length=2_000_000)


class TaskImportOut(BaseModel):
    """A summary of an import run."""

    created_count: int
    skipped_count: int
    identifiers: list[str]
    errors: list[str]
