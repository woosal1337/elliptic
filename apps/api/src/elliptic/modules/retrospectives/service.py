"""Retrospective business logic (COS-267)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.projects.models import Project
from elliptic.modules.retrospectives.models import Retrospective
from elliptic.modules.retrospectives.schemas import (
    RetrospectiveCreateIn,
    RetrospectiveUpdateIn,
)


async def _project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    found = await session.scalar(
        select(Project.id).where(
            Project.id == project_id, Project.org_id == ctx.org.id, Project.deleted_at.is_(None)
        )
    )
    if found is None:
        raise NotFoundError("Project not found")


async def list_retros(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[Retrospective]:
    await _project(session, ctx, project_id)
    result = await session.scalars(
        select(Retrospective)
        .where(Retrospective.project_id == project_id, Retrospective.org_id == ctx.org.id)
        .order_by(Retrospective.created_at.desc())
    )
    return list(result)


async def create_retro(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: RetrospectiveCreateIn
) -> Retrospective:
    await _project(session, ctx, project_id)
    retro = Retrospective(
        org_id=ctx.org.id,
        project_id=project_id,
        cycle_id=payload.cycle_id,
        title=payload.title,
        went_well=payload.went_well,
        to_improve=payload.to_improve,
        action_items=payload.action_items,
        created_by=ctx.user.id,
    )
    session.add(retro)
    await session.flush()
    return retro


async def _get(session: AsyncSession, ctx: OrgContext, retro_id: uuid.UUID) -> Retrospective:
    retro = await session.scalar(
        select(Retrospective).where(
            Retrospective.id == retro_id, Retrospective.org_id == ctx.org.id
        )
    )
    if retro is None:
        raise NotFoundError("Retrospective not found")
    return retro


async def update_retro(
    session: AsyncSession, ctx: OrgContext, retro_id: uuid.UUID, payload: RetrospectiveUpdateIn
) -> Retrospective:
    retro = await _get(session, ctx, retro_id)
    if payload.title is not None:
        retro.title = payload.title
    if payload.clear_cycle:
        retro.cycle_id = None
    elif payload.cycle_id is not None:
        retro.cycle_id = payload.cycle_id
    if payload.went_well is not None:
        retro.went_well = payload.went_well or None
    if payload.to_improve is not None:
        retro.to_improve = payload.to_improve or None
    if payload.action_items is not None:
        retro.action_items = payload.action_items or None
    await session.flush()
    return retro


async def delete_retro(session: AsyncSession, ctx: OrgContext, retro_id: uuid.UUID) -> None:
    retro = await _get(session, ctx, retro_id)
    await session.delete(retro)
    await session.flush()
