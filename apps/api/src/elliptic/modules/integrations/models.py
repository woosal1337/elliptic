"""Integration connection models."""

import uuid

from sqlalchemy import Boolean, ForeignKey, LargeBinary, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class SlackConnection(BaseModel):
    """An org's Slack workspace connection with an encrypted bot token.

    At most one connection exists per org. The bot token is encrypted at rest
    with the same AES-256-GCM custody as BYOK provider keys; only ``team_name``
    is ever exposed through the API.
    """

    __tablename__ = "slack_connections"
    __table_args__ = (UniqueConstraint("org_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    team_id: Mapped[str] = mapped_column(String(100))
    team_name: Mapped[str] = mapped_column(String(255))
    encrypted_token: Mapped[bytes] = mapped_column(LargeBinary)
    nonce: Mapped[bytes] = mapped_column(LargeBinary)
    installed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    default_project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )


class EmailIntake(BaseModel):
    """A per-project inbound email address that turns messages into triage tasks (COS-62)."""

    __tablename__ = "email_intakes"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))


class SentryIntake(BaseModel):
    """A per-project inbound Sentry webhook that turns alerts into triage bugs (COS-260)."""

    __tablename__ = "sentry_intakes"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
