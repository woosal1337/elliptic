"""Delta sync schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SyncedRow(BaseModel):
    """One changed row.

    Deliberately thin. A delta feed says *what* changed; the client already
    knows how to fetch or render the entity, and sending every column of every
    changed row would make the feed as costly as the list it replaces.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    updated_at: datetime
    #: Only projects can carry this — they soft-delete for the restore window.
    #: Everything else reports removals through `deletions`.
    deleted_at: datetime | None = None


class ChangesOut(BaseModel):
    """Everything that changed in an org since a cursor."""

    #: Pass back as `since` on the next poll.
    cursor: datetime
    #: A collection hit the page limit; poll again now rather than on the timer.
    has_more: bool
    #: Collection name -> changed rows.
    changes: dict[str, list[SyncedRow]]
    #: Collection name -> ids the client should drop. Empty on a bootstrap,
    #: which has no local copy to forget.
    deletions: dict[str, list[uuid.UUID]] = {}
