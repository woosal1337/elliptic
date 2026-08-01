"""Project webhook model with an encrypted destination URL."""

import secrets
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


def generate_webhook_secret() -> str:
    """A 64-char hex signing secret used to HMAC-sign outbound deliveries."""
    return secrets.token_hex(32)


class ProjectWebhook(BaseModel):
    """A Slack or Discord incoming-webhook subscription scoped to one project.

    The destination URL is encrypted at rest with the same AES-256-GCM custody
    as BYOK provider keys; only ``url_hint`` is ever exposed through the API.
    """

    __tablename__ = "project_webhooks"
    __table_args__ = (Index("ix_project_webhooks_project_enabled", "project_id", "enabled"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(16))
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    encrypted_url: Mapped[bytes] = mapped_column(LargeBinary)
    nonce: Mapped[bytes] = mapped_column(LargeBinary)
    url_hint: Mapped[str] = mapped_column(String(80))
    secret: Mapped[str] = mapped_column(String(64), default=generate_webhook_secret)
    enabled: Mapped[bool] = mapped_column(Boolean, server_default=true())
    events: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    last_delivery_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_delivery_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    last_delivery_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
