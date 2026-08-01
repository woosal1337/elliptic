"""Work-item type hierarchy levels (COS-71)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.tasks.models import (
    DEFAULT_TYPE_LEVELS,
    TaskKind,
    WorkItemTypeLevel,
)


async def list_type_levels(session: AsyncSession, ctx: OrgContext) -> list[WorkItemTypeLevel]:
    """Return the org's per-kind hierarchy levels, seeding defaults on first access."""
    existing = list(
        await session.scalars(
            select(WorkItemTypeLevel).where(WorkItemTypeLevel.org_id == ctx.org.id)
        )
    )
    if existing:
        return sorted(existing, key=lambda level: level.level, reverse=True)
    seeded = [
        WorkItemTypeLevel(org_id=ctx.org.id, kind=kind, level=level)
        for kind, level in DEFAULT_TYPE_LEVELS.items()
    ]
    session.add_all(seeded)
    await session.flush()
    return sorted(seeded, key=lambda level: level.level, reverse=True)


async def level_map(session: AsyncSession, ctx: OrgContext) -> dict[TaskKind, int]:
    """A {kind: level} map for nesting enforcement (defaults when unset)."""
    levels = await list_type_levels(session, ctx)
    resolved = dict(DEFAULT_TYPE_LEVELS)
    for entry in levels:
        resolved[entry.kind] = entry.level
    return resolved


async def set_type_levels(
    session: AsyncSession, ctx: OrgContext, levels: dict[TaskKind, int]
) -> list[WorkItemTypeLevel]:
    """Update the level for one or more work-item types."""
    await list_type_levels(session, ctx)
    rows = {
        row.kind: row
        for row in await session.scalars(
            select(WorkItemTypeLevel).where(WorkItemTypeLevel.org_id == ctx.org.id)
        )
    }
    for kind, level in levels.items():
        existing = rows.get(kind)
        if existing is not None:
            existing.level = level
        else:
            new_row = WorkItemTypeLevel(org_id=ctx.org.id, kind=kind, level=level)
            session.add(new_row)
            rows[kind] = new_row
    await session.flush()
    return sorted(rows.values(), key=lambda level: level.level, reverse=True)
