"""Workflow status schemas."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.projects.models import ProjectRole
from elliptic.modules.tasks.models import StatusCategory, TaskKind
from elliptic.modules.workflow.models import ConditionType


class WorkflowStatusIn(BaseModel):
    """Payload to add a status within a category."""

    name: str = Field(min_length=1, max_length=100)
    category: StatusCategory
    color: str = Field(default="muted-foreground", max_length=40)
    position: float | None = None
    team_id: uuid.UUID | None = None


class WorkflowStatusUpdateIn(BaseModel):
    """Editable status fields. Category is immutable and absent by design."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=40)
    position: float | None = None
    is_default: bool | None = None
    allow_new_items: bool | None = None


class WorkflowStatusOut(BaseModel):
    """Serialized workflow status."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: StatusCategory
    color: str
    position: float
    is_default: bool
    allow_new_items: bool = True
    team_id: uuid.UUID | None


class WorkflowTransitionIn(BaseModel):
    """Allow a transition between two workflow statuses."""

    from_status_id: uuid.UUID
    to_status_id: uuid.UUID
    required_role: ProjectRole | None = None
    kind: TaskKind | None = None


class WorkflowTransitionOut(BaseModel):
    """Serialized allowed-transition rule."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_status_id: uuid.UUID
    to_status_id: uuid.UUID
    required_role: ProjectRole | None = None
    kind: TaskKind | None = None


class TransitionConditionIn(BaseModel):
    """Attach a blocking pre-validation condition to a transition (COS-220)."""

    from_status_id: uuid.UUID
    to_status_id: uuid.UUID
    condition: ConditionType


class TransitionConditionOut(BaseModel):
    """Serialized transition condition."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_status_id: uuid.UUID
    to_status_id: uuid.UUID
    condition: ConditionType
