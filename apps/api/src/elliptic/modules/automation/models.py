"""Automation rule model: triggers, actions, and skills."""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, false, true
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class AutomationTrigger(enum.StrEnum):
    """What fires an automation rule."""

    ON_STATUS_CHANGE = "on_status_change"


class AutomationActionType(enum.StrEnum):
    """A mutation an automation rule can apply to a task."""

    LABEL = "label"
    ROUTE = "route"
    ASSIGN = "assign"
    SET_PRIORITY = "set_priority"


class AutomationRule(BaseModel):
    """A saved rule that applies actions to a task on a trigger, or on demand as a skill."""

    __tablename__ = "automation_rules"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    trigger: Mapped[AutomationTrigger] = mapped_column(
        Enum(AutomationTrigger, native_enum=False, length=40)
    )
    actions: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    is_skill: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
