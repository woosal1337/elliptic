"""Automation rule schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.automation.models import AutomationActionType, AutomationTrigger


class AutomationActionIn(BaseModel):
    """One action in a rule."""

    type: AutomationActionType
    value: str = Field(min_length=1)


class AutomationRuleIn(BaseModel):
    """Payload to create an automation rule."""

    name: str = Field(min_length=1, max_length=200)
    trigger: AutomationTrigger
    actions: list[AutomationActionIn] = Field(default_factory=list)
    is_skill: bool = False
    enabled: bool = True


class AutomationRuleUpdateIn(BaseModel):
    """Editable rule fields; only provided keys are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    trigger: AutomationTrigger | None = None
    actions: list[AutomationActionIn] | None = None
    is_skill: bool | None = None
    enabled: bool | None = None


class AutomationActionOut(BaseModel):
    """Serialized action."""

    type: AutomationActionType
    value: str


class AutomationRuleOut(BaseModel):
    """Serialized automation rule."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    trigger: AutomationTrigger
    actions: list[AutomationActionOut]
    is_skill: bool
    enabled: bool
    created_at: datetime


class SkillRunIn(BaseModel):
    """Payload to invoke a skill against a task."""

    task_id: uuid.UUID


class SkillRunOut(BaseModel):
    """Result of a skill run."""

    ok: bool
