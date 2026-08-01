"""Calendar event schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EventVisibility = Literal["team", "personal"]
EventScopeFilter = Literal["all", "team", "personal"]


class EventCreateIn(BaseModel):
    """Payload to create a calendar event."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    location: str | None = Field(default=None, max_length=500)
    starts_at: datetime
    ends_at: datetime
    all_day: bool = False
    visibility: EventVisibility = "team"
    meeting_id: uuid.UUID | None = None


class EventUpdateIn(BaseModel):
    """Editable calendar event fields."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    location: str | None = Field(default=None, max_length=500)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    all_day: bool | None = None
    visibility: EventVisibility | None = None
    meeting_id: uuid.UUID | None = None


class EventOut(BaseModel):
    """Serialized calendar event with a derived scope."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    owner_id: uuid.UUID | None
    scope: EventVisibility
    title: str
    description: str | None
    location: str | None
    starts_at: datetime
    ends_at: datetime
    all_day: bool
    meeting_id: uuid.UUID | None
    linked_meeting_id: uuid.UUID | None = None
    linked_notes_count: int = 0
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


BriefSourceKind = Literal["meeting", "task", "note", "project"]


class MeetingBriefBulletOut(BaseModel):
    """One pre-meeting brief bullet with a clickable source."""

    text: str
    source_kind: BriefSourceKind
    source_id: uuid.UUID
    source_label: str


class MeetingBriefOut(BaseModel):
    """A 2-3 bullet pre-meeting brief pulled from existing CompanyOS data."""

    bullets: list[MeetingBriefBulletOut]
    confidence: float
    generated_at: datetime
