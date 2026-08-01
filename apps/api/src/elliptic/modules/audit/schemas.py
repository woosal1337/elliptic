"""Compliance audit-log schemas."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class AuditEntryOut(BaseModel):
    """One audit-log entry derived from an activity event, with actor + diff."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    actor_id: uuid.UUID | None
    actor_name: str
    actor_type: Literal["user", "system"]
    entity_type: str
    entity_id: uuid.UUID
    event_type: str
    project_id: uuid.UUID | None
    changes: dict[str, Any] = {}
