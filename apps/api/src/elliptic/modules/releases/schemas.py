"""Release schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.releases.models import ChangelogCategory, ReleaseStatus


class ReleaseCreateIn(BaseModel):
    """Payload to create a release."""

    name: str = Field(min_length=1, max_length=255)
    version: str | None = Field(default=None, max_length=60)
    description: str | None = None
    released_at: date | None = None


class ReleaseUpdateIn(BaseModel):
    """Editable release fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    version: str | None = Field(default=None, max_length=60)
    description: str | None = None
    changelog: str | None = None
    status: ReleaseStatus | None = None
    released_at: date | None = None


class ReleaseOut(BaseModel):
    """Serialized release with rolled-up task counts."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    version: str | None
    description: str | None
    changelog: str | None = None
    status: ReleaseStatus
    released_at: date | None
    task_total: int = 0
    task_done: int = 0
    created_at: datetime


class ChangelogEntryIn(BaseModel):
    """Create a changelog entry (COS-269)."""

    category: ChangelogCategory = ChangelogCategory.ADDED
    title: str = Field(min_length=1, max_length=500)
    body: str | None = None
    pr_url: str | None = Field(default=None, max_length=500)


class ChangelogEntryUpdateIn(BaseModel):
    """Edit a changelog entry."""

    category: ChangelogCategory | None = None
    title: str | None = Field(default=None, min_length=1, max_length=500)
    body: str | None = None
    pr_url: str | None = Field(default=None, max_length=500)


class ChangelogEntryOut(BaseModel):
    """Serialized changelog entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    release_id: uuid.UUID
    category: ChangelogCategory
    title: str
    body: str | None
    pr_url: str | None
    sort_order: float
