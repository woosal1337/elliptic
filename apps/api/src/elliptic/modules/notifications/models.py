"""Recipient-scoped notification model."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class NotificationType(enum.StrEnum):
    """The kind of event a notification represents."""

    ASSIGNED = "assigned"
    MENTIONED = "mentioned"
    COMMENTED = "commented"
    MEMBER_ADDED = "member_added"
    MEETING_ACTION_DONE = "meeting_action_done"
    URGENT = "urgent"
    TASK_CREATED = "task_created"
    STATUS_CHANGED = "status_changed"


class Notification(BaseModel):
    """One in-app notification delivered to a single recipient."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_recipient_read", "recipient_id", "read_at"),
        Index("ix_notifications_org", "org_id"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, native_enum=False, length=40)
    )
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500))
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class NotificationTrigger(enum.StrEnum):
    """A category of event that can trigger an email notification."""

    PROPERTY_CHANGE = "property_change"
    STATE_CHANGE = "state_change"
    COMPLETED = "completed"
    COMMENTS = "comments"
    MENTIONS = "mentions"


class NotificationPreference(BaseModel):
    """A user's per-trigger email preferences, scoped to a workspace or a project.

    The row with ``project_id IS NULL`` is the workspace default; a row with a
    ``project_id`` overrides the default for that project. The in-app inbox is
    always on and not governed by these rows.
    """

    __tablename__ = "notification_preferences"
    __table_args__ = (
        UniqueConstraint("org_id", "user_id", "project_id", name="uq_notif_pref_scope"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    email_property_change: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true()
    )
    email_state_change: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    email_completed: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    email_comments: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    email_mentions: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())


class DeviceToken(BaseModel):
    """A registered mobile/web push token for a user (COS-222/290)."""

    __tablename__ = "device_tokens"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[str] = mapped_column(String(10), default="ios")
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
