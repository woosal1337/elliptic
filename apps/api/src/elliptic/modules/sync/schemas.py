"""Delta sync schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SyncedRow(BaseModel):
    """One changed row.

    Deliberately thin. A delta feed says *what changed*; the client already
    knows how to fetch or render the full entity, and sending every column of
    every changed row would make the feed as expensive as the list it replaces.
    `deleted_at` is the load-bearing field — set means "drop your copy".
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    updated_at: datetime
    deleted_at: datetime | None = None


class ChangesOut(BaseModel):
    """Everything that changed in an org since a cursor."""

    #: Pass back as `since` on the next poll.
    cursor: datetime
    #: A collection hit the page limit; poll again now rather than on the timer.
    has_more: bool
    #: Collection name -> changed rows.
    changes: dict[str, list[SyncedRow]]
