"""Delta sync: what changed in an organisation since a cursor.

A client that already holds a copy of the workspace should ask for the
difference, not the whole thing. This reads the change feed straight off
``updated_at`` rather than from the event outbox, which matters: the outbox only
contains what a writer remembered to emit, whereas ``updated_at`` is maintained
by the ORM on every write. A feed built on the outbox is silently incomplete the
first time somebody adds a mutation and forgets the event; this one cannot be.

Deleted rows are part of the answer. A hard delete leaves nothing to report, so
a client holding the row would keep showing it forever — which is why tasks and
notes gained tombstones. A tombstoned row comes back in the feed with
``deleted_at`` set and the client drops it.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.notes.models import Note
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task

# Re-read a little of what was already sent. A row's updated_at is stamped when
# the statement runs, but the row only becomes visible when its transaction
# commits — so a naive "strictly after the last cursor" feed can step over a row
# committed slightly late. Overlapping makes delivery at-least-once, and clients
# key by id and are idempotent anyway.
CURSOR_OVERLAP = timedelta(seconds=2)

#: Per request, per collection. Keeps one enormous org from producing a reply
#: that has to be buffered in full before anything can be sent.
DEFAULT_LIMIT = 500
MAX_LIMIT = 2000

SYNCED_MODELS: dict[str, Any] = {
    "tasks": Task,
    "notes": Note,
    "projects": Project,
}


@dataclass
class Changes:
    """Rows that changed, plus the cursor to resume from."""

    cursor: datetime
    #: True when a collection hit the limit, so the caller should poll again
    #: immediately rather than waiting for its normal interval.
    has_more: bool = False
    collections: dict[str, list[Any]] = field(default_factory=dict)


def _has_column(model: Any, name: str) -> bool:
    return hasattr(model, name)


async def changes_since(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    since: datetime | None,
    limit: int = DEFAULT_LIMIT,
    kinds: list[str] | None = None,
) -> Changes:
    """Every row in this org touched since ``since``, tombstones included.

    ``since`` of None means a full bootstrap: the caller has nothing yet, so it
    gets everything currently live. Tombstones are omitted from a bootstrap —
    there is no local copy for them to delete.
    """
    limit = max(1, min(limit, MAX_LIMIT))
    requested = kinds or list(SYNCED_MODELS)
    unknown = [k for k in requested if k not in SYNCED_MODELS]
    if unknown:
        raise ValueError(f"unknown collection: {', '.join(sorted(unknown))}")

    # Taken before reading so anything committed mid-request is picked up by the
    # next poll rather than skipped by a cursor from after the fact.
    started_at = datetime.now(UTC)
    floor = since - CURSOR_OVERLAP if since else None

    result = Changes(cursor=started_at)
    for kind in requested:
        model = SYNCED_MODELS[kind]
        query = select(model).where(model.org_id == ctx.org.id)

        if floor is None:
            # Bootstrap: live rows only.
            if _has_column(model, "deleted_at"):
                query = query.where(model.deleted_at.is_(None))
        else:
            query = query.where(model.updated_at > floor)

        rows = list(
            await session.scalars(
                query.order_by(model.updated_at.asc(), model.id.asc()).limit(limit)
            )
        )
        if len(rows) == limit:
            result.has_more = True
        result.collections[kind] = rows

    return result


async def purge_tombstones(
    session: AsyncSession, model: Any, *, retention_days: int = 30
) -> int:
    """Delete tombstones older than the retention window.

    A tombstone only exists to tell clients to forget a row. Past the window,
    any client still carrying that row is far past a full resync anyway, so the
    tombstone is dead weight. Mirrors purge_deleted_projects (SAFE-06).
    """
    cutoff = datetime.now(UTC) - timedelta(days=retention_days)
    rows = list(
        await session.scalars(
            select(model).where(model.deleted_at.is_not(None), model.deleted_at < cutoff)
        )
    )
    for row in rows:
        await session.delete(row)
    await session.commit()
    return len(rows)


def entity_ids(rows: list[Any]) -> list[uuid.UUID]:
    return [row.id for row in rows]
