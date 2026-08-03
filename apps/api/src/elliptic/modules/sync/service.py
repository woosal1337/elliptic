"""Delta sync: what changed in an organisation since a cursor.

A client that already holds a copy of the workspace should ask for the
difference, not the whole thing. This reads the change feed straight off
``updated_at`` rather than from the event outbox, which matters: the outbox only
contains what a writer remembered to emit, whereas ``updated_at`` is maintained
by the ORM on every write. A feed built on the outbox is silently incomplete the
first time somebody adds a mutation and forgets the event; this one cannot be.

Deletions are part of the answer, and they are recorded separately rather than
flagged on the row. Tasks and notes are the parents of 16 and 6 cascading
foreign keys and both are self-referential: a real DELETE takes the children and
the subtree with it, which is what the user asked for. Flagging instead would
leave live children pointing at a row that is meant to be gone, hold unique
values hostage, and put a ``deleted_at IS NULL`` filter on every read in the
codebase — where one omission silently resurrects deleted data. So the delete
stays a delete and ``DeletedEntity`` records that it happened.

Projects are the exception and keep their own ``deleted_at``: they already
soft-delete for the 30-day restore window (SAFE-06), so a deleted project
surfaces through the normal changed-rows path with its flag set.
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
from elliptic.modules.sync.models import DeletedEntity
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
    #: Collection name -> ids the client should drop.
    deletions: dict[str, list[uuid.UUID]] = field(default_factory=dict)


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
            # Bootstrap: live rows only. Projects are the one collection that
            # can carry a soft-deleted row.
            if hasattr(model, "deleted_at"):
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

    # A bootstrapping client holds nothing, so it has nothing to forget.
    if floor is not None:
        deletions = list(
            await session.scalars(
                select(DeletedEntity)
                .where(
                    DeletedEntity.org_id == ctx.org.id,
                    DeletedEntity.entity_type.in_(requested),
                    DeletedEntity.created_at > floor,
                )
                .order_by(DeletedEntity.created_at.asc(), DeletedEntity.id.asc())
                .limit(limit)
            )
        )
        if len(deletions) == limit:
            result.has_more = True
        for kind in requested:
            result.deletions[kind] = [row.entity_id for row in deletions if row.entity_type == kind]

    return result


def record_deletion(
    session: AsyncSession, ctx: OrgContext, *, entity_type: str, entity_id: uuid.UUID
) -> None:
    """Note that something was deleted, in the caller's transaction.

    Added to the session rather than committed: if the delete rolls back, so
    does its tombstone. A tombstone for a row that still exists would make
    clients drop data that is really there.
    """
    session.add(
        DeletedEntity(
            org_id=ctx.org.id,
            entity_type=entity_type,
            entity_id=entity_id,
            deleted_by=ctx.user.id if ctx.user else None,
        )
    )


async def purge_tombstones(session: AsyncSession, *, retention_days: int = 30) -> int:
    """Drop tombstones older than the retention window.

    A tombstone exists only to tell clients to forget a row. Past the window any
    client still carrying it is long overdue a full bootstrap anyway, so keeping
    the record would grow the table forever for no reader. Mirrors
    purge_deleted_projects (SAFE-06).
    """
    cutoff = datetime.now(UTC) - timedelta(days=retention_days)
    rows = list(
        await session.scalars(select(DeletedEntity).where(DeletedEntity.created_at < cutoff))
    )
    for row in rows:
        await session.delete(row)
    await session.commit()
    return len(rows)
