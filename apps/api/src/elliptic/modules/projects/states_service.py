"""Portfolio project-state business logic (COS-240)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.projects.models import (
    DEFAULT_PROJECT_STATES,
    ProjectState,
    ProjectStateGroup,
)


async def list_project_states(session: AsyncSession, ctx: OrgContext) -> list[ProjectState]:
    """Return the org's portfolio states, seeding the defaults on first access."""
    existing = list(
        await session.scalars(
            select(ProjectState)
            .where(ProjectState.org_id == ctx.org.id)
            .order_by(ProjectState.sort_order, ProjectState.name)
        )
    )
    if existing:
        return existing
    seeded = [
        ProjectState(org_id=ctx.org.id, name=name, color=color, group=group, sort_order=index)
        for index, (group, name, color) in enumerate(DEFAULT_PROJECT_STATES)
    ]
    session.add_all(seeded)
    await session.flush()
    return seeded


async def create_project_state(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    name: str,
    color: str,
    group: ProjectStateGroup,
) -> ProjectState:
    clash = await session.scalar(
        select(ProjectState.id).where(ProjectState.org_id == ctx.org.id, ProjectState.name == name)
    )
    if clash is not None:
        raise ConflictError("A project state with this name already exists")
    next_order = (
        await session.scalar(
            select(func.coalesce(func.max(ProjectState.sort_order), -1)).where(
                ProjectState.org_id == ctx.org.id
            )
        )
    ) or 0
    state = ProjectState(
        org_id=ctx.org.id, name=name, color=color, group=group, sort_order=next_order + 1
    )
    session.add(state)
    await session.flush()
    return state


async def _get_state(session: AsyncSession, ctx: OrgContext, state_id: uuid.UUID) -> ProjectState:
    state = await session.scalar(
        select(ProjectState).where(ProjectState.id == state_id, ProjectState.org_id == ctx.org.id)
    )
    if state is None:
        raise NotFoundError("Project state not found")
    return state


async def update_project_state(
    session: AsyncSession,
    ctx: OrgContext,
    state_id: uuid.UUID,
    *,
    name: str | None,
    color: str | None,
    group: ProjectStateGroup | None,
    sort_order: int | None,
) -> ProjectState:
    state = await _get_state(session, ctx, state_id)
    if name is not None and name != state.name:
        clash = await session.scalar(
            select(ProjectState.id).where(
                ProjectState.org_id == ctx.org.id,
                ProjectState.name == name,
                ProjectState.id != state_id,
            )
        )
        if clash is not None:
            raise ConflictError("A project state with this name already exists")
        state.name = name
    if color is not None:
        state.color = color
    if group is not None:
        state.group = group
    if sort_order is not None:
        state.sort_order = sort_order
    await session.flush()
    return state


async def delete_project_state(session: AsyncSession, ctx: OrgContext, state_id: uuid.UUID) -> None:
    """Delete a state; projects pointing at it are unset (FK ON DELETE SET NULL)."""
    state = await _get_state(session, ctx, state_id)
    await session.delete(state)
    await session.flush()
