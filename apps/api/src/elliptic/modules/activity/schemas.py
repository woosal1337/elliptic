"""Activity event response schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ActivityEventOut(BaseModel):
    """Serialized activity event."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    actor_id: uuid.UUID | None
    entity_type: str
    entity_id: uuid.UUID
    event_type: str
    payload: dict[str, Any] | None
    created_at: datetime
