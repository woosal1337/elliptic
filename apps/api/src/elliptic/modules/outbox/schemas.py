"""Event backbone schemas (COS-247)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WebhookEndpointIn(BaseModel):
    """Register a webhook subscription (COS-247)."""

    url: str = Field(min_length=1, max_length=1000)
    event_types: list[str] = Field(default_factory=list)
    secret: str | None = Field(default=None, max_length=100)


class WebhookEndpointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    event_types: list[str]
    enabled: bool
    created_at: datetime


class EventOut(BaseModel):
    """A captured outbox event."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID | None
    event_type: str
    initiator_type: str
    delivered_at: datetime | None
    delivery_error: str | None
    attempts: int
    failed: bool = False
    next_attempt_at: datetime | None = None
    created_at: datetime


class DispatchOut(BaseModel):
    delivered: int
