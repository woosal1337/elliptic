"""Register (RAID / decisions / risks) business logic (COS-261)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.projects.models import Project
from elliptic.modules.register.models import RegisterEntry, RegisterKind
from elliptic.modules.register.schemas import RegisterEntryIn, RegisterEntryUpdateIn


async def _assert_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    found = await session.scalar(
        select(Project.id).where(
            Project.id == project_id,
            Project.org_id == ctx.org.id,
            Project.deleted_at.is_(None),
        )
    )
    if found is None:
        raise NotFoundError("Project not found")


async def list_entries(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    *,
    kind: RegisterKind | None = None,
) -> list[RegisterEntry]:
    await _assert_project(session, ctx, project_id)
    where = [RegisterEntry.org_id == ctx.org.id, RegisterEntry.project_id == project_id]
    if kind is not None:
        where.append(RegisterEntry.kind == kind)
    result = await session.scalars(
        select(RegisterEntry).where(*where).order_by(RegisterEntry.created_at.desc())
    )
    return list(result)


async def create_entry(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: RegisterEntryIn
) -> RegisterEntry:
    await _assert_project(session, ctx, project_id)
    entry = RegisterEntry(
        org_id=ctx.org.id,
        project_id=project_id,
        kind=payload.kind,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        owner_id=payload.owner_id,
        probability=payload.probability,
        impact=payload.impact,
        due_date=payload.due_date,
        created_by=ctx.user.id,
    )
    session.add(entry)
    await session.flush()
    return entry


async def _get_entry(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, entry_id: uuid.UUID
) -> RegisterEntry:
    entry = await session.scalar(
        select(RegisterEntry).where(
            RegisterEntry.id == entry_id,
            RegisterEntry.org_id == ctx.org.id,
            RegisterEntry.project_id == project_id,
        )
    )
    if entry is None:
        raise NotFoundError("Register entry not found")
    return entry


async def update_entry(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: RegisterEntryUpdateIn,
) -> RegisterEntry:
    entry = await _get_entry(session, ctx, project_id, entry_id)
    for field in ("title", "description", "status", "probability", "impact", "due_date"):
        value = getattr(payload, field)
        if value is not None:
            setattr(entry, field, value)
    if payload.clear_owner:
        entry.owner_id = None
    elif payload.owner_id is not None:
        entry.owner_id = payload.owner_id
    if payload.clear_due_date:
        entry.due_date = None
    await session.flush()
    return entry


async def delete_entry(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, entry_id: uuid.UUID
) -> None:
    entry = await _get_entry(session, ctx, project_id, entry_id)
    await session.delete(entry)
    await session.flush()
