"""Notification schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.notifications.models import NotificationType

NotificationStatusFilter = Literal["unread", "all", "archived"]


class NotificationOut(BaseModel):
    """Serialized notification with the resolved actor display name."""

    id: uuid.UUID
    org_id: uuid.UUID
    type: NotificationType
    entity_type: str
    entity_id: uuid.UUID | None
    actor_id: uuid.UUID | None
    actor_name: str | None
    title: str
    snippet: str | None
    read_at: datetime | None
    archived_at: datetime | None
    snoozed_until: datetime | None
    created_at: datetime


class NotificationListOut(BaseModel):
    """A list of notifications with the recipient's current unread count."""

    items: list[NotificationOut]
    unread_count: int


class UnreadCountOut(BaseModel):
    """The recipient's current unread notification count."""

    count: int


class SnoozeIn(BaseModel):
    """Payload to snooze a notification until a future moment."""

    until: datetime


class NotificationPrefsBody(BaseModel):
    """The five per-trigger email toggles for one scope."""

    email_property_change: bool = True
    email_state_change: bool = True
    email_completed: bool = True
    email_comments: bool = True
    email_mentions: bool = True


class NotificationPrefsIn(NotificationPrefsBody):
    """Upsert preferences for the workspace default or a per-project override."""

    project_id: uuid.UUID | None = None


class NotificationPrefsOut(NotificationPrefsBody):
    """Serialized preferences for one scope (project_id null = workspace default)."""

    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID | None


class CatchUpGroup(BaseModel):
    """One entity's rolled-up unread count (COS-161)."""

    entity_type: str
    entity_id: uuid.UUID | None = None
    title: str
    count: int
    latest_at: str


class CatchUpOut(BaseModel):
    """A catch-up digest of unread notifications."""

    total_unread: int
    by_type: dict[str, int]
    groups: list[CatchUpGroup]


class MarkSeenIn(BaseModel):
    """Mark all of a catch-up entity's unread notifications read (COS-239)."""

    entity_type: str = Field(min_length=1, max_length=50)
    entity_id: uuid.UUID | None = None


class MarkSeenOut(BaseModel):
    marked: int


class CatchUpSummaryOut(BaseModel):
    """An AI 'what changed' digest for a project (COS-239)."""

    summary: str
    event_count: int


class DeviceTokenIn(BaseModel):
    platform: Literal["ios", "android", "web"] = "ios"
    token: str = Field(min_length=1, max_length=255)


class DeviceTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    platform: str
    token: str
    created_at: datetime
