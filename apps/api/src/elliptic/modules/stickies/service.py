"""Sticky business logic (per-user, org-scoped)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.stickies.models import Sticky
from elliptic.modules.stickies.schemas import StickyCreateIn, StickyUpdateIn


async def list_stickies(session: AsyncSession, ctx: OrgContext) -> list[Sticky]:
    """List the caller's stickies, oldest position first."""
    result = await session.scalars(
        select(Sticky)
        .where(Sticky.org_id == ctx.org.id, Sticky.user_id == ctx.user.id)
        .order_by(Sticky.position, Sticky.created_at)
    )
    return list(result)


async def create_sticky(session: AsyncSession, ctx: OrgContext, payload: StickyCreateIn) -> Sticky:
    """Create a sticky for the caller."""
    sticky = Sticky(
        org_id=ctx.org.id,
        user_id=ctx.user.id,
        content=payload.content,
        color=payload.color,
    )
    session.add(sticky)
    await session.flush()
    return sticky


async def _get(session: AsyncSession, ctx: OrgContext, sticky_id: uuid.UUID) -> Sticky:
    sticky = await session.scalar(
        select(Sticky).where(
            Sticky.id == sticky_id,
            Sticky.org_id == ctx.org.id,
            Sticky.user_id == ctx.user.id,
        )
    )
    if sticky is None:
        raise NotFoundError("Sticky not found")
    return sticky


async def update_sticky(
    session: AsyncSession, ctx: OrgContext, sticky_id: uuid.UUID, payload: StickyUpdateIn
) -> Sticky:
    """Apply updates to a sticky."""
    sticky = await _get(session, ctx, sticky_id)
    if payload.content is not None:
        sticky.content = payload.content
    if payload.color is not None:
        sticky.color = payload.color
    if payload.position is not None:
        sticky.position = payload.position
    await session.flush()
    return sticky


async def delete_sticky(session: AsyncSession, ctx: OrgContext, sticky_id: uuid.UUID) -> None:
    """Delete a sticky."""
    sticky = await _get(session, ctx, sticky_id)
    await session.delete(sticky)
    await session.flush()


async def convert_sticky(
    session: AsyncSession,
    ctx: OrgContext,
    sticky_id: uuid.UUID,
    *,
    target: str,
    project_id: uuid.UUID | None,
    delete_after: bool,
) -> dict[str, object]:
    """Atomically turn a sticky into a task or note, then optionally remove it (COS-162)."""
    from elliptic.core.exceptions import BadRequestError  # noqa: PLC0415

    sticky = await _get(session, ctx, sticky_id)
    body = (sticky.content or "").strip()
    title = (body.splitlines()[0] if body else "Untitled sticky")[:500]

    result: dict[str, object]
    if target == "task":
        if project_id is None:
            raise BadRequestError("project_id is required to convert a sticky to a task")
        from elliptic.modules.tasks.schemas import TaskCreateIn  # noqa: PLC0415
        from elliptic.modules.tasks.service import create_task  # noqa: PLC0415

        task, project = await create_task(
            session, ctx, project_id, TaskCreateIn(title=title, description=body or None)
        )
        result = {"target": "task", "entity_id": task.id, "project_id": project.id}
    elif target == "note":
        from elliptic.modules.notes.schemas import NoteCreateIn  # noqa: PLC0415
        from elliptic.modules.notes.service import create_note  # noqa: PLC0415

        note = await create_note(
            session, ctx, NoteCreateIn(title=title, content=body, project_id=project_id)
        )
        result = {"target": "note", "entity_id": note.id, "project_id": project_id}
    else:
        raise BadRequestError("target must be 'task' or 'note'")

    if delete_after:
        await session.delete(sticky)
    await session.flush()
    return result
