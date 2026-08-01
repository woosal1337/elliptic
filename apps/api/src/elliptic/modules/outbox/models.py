"""Event backbone: a durable outbox + webhook subscriptions (COS-247).

Distinct from the calendar ``events`` module — this is the domain-event /
webhook delivery backbone.
"""

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, false
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class EventInitiatorType(enum.StrEnum):
    USER = "user"
    SYSTEM_IMPORT = "system.import"
    SYSTEM_AUTOMATION = "system.automation"
    SYSTEM_AGENT = "system.agent"


class EventOutbox(BaseModel):
    """A durable domain event captured in the writer's transaction (COS-247).

    A poller drains undelivered rows and fans them out to matching webhook
    endpoints. ``idempotency_key`` (unique per org) lets a producer dedupe.
    """

    __tablename__ = "event_outbox"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    initiator_type: Mapped[str] = mapped_column(String(50), default=EventInitiatorType.USER.value)
    initiator_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(200), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class WebhookEndpoint(BaseModel):
    """A per-org webhook subscription to a set of event types (COS-247)."""

    __tablename__ = "webhook_endpoints"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(1000))
    secret: Mapped[str] = mapped_column(String(100))
    event_types: Mapped[list[str]] = mapped_column(JSONB, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=false())
