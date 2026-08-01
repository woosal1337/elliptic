"""Saved task view endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.tasks.schemas import TaskOut
from elliptic.modules.tasks.service import serialize_mixed_tasks
from elliptic.modules.views import service
from elliptic.modules.views.schemas import TaskViewIn, TaskViewOut, TaskViewUpdateIn

router = APIRouter(prefix="/orgs/{org_id}/views", tags=["views"])


@router.get("")
async def list_views(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[TaskViewOut]]:
    views = await service.list_views(session, ctx)
    return ok([service.view_to_out(view) for view in views])


@router.get("/{view_id}/tasks")
async def team_view_tasks(
    view_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskOut]]:
    """The unioned task dataset of a teamspace view (across its linked projects)."""
    tasks_with_keys = await service.resolve_team_view_dataset(session, ctx, view_id)
    return ok(await serialize_mixed_tasks(session, tasks_with_keys))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_view(
    payload: TaskViewIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskViewOut]:
    view = await service.create_view(session, ctx, payload)
    return ok(service.view_to_out(view), message="View saved")


@router.patch("/{view_id}")
async def update_view(
    view_id: uuid.UUID, payload: TaskViewUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskViewOut]:
    view = await service.update_view(session, ctx, view_id, payload)
    return ok(service.view_to_out(view))


@router.delete("/{view_id}")
async def delete_view(
    view_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_view(session, ctx, view_id)
    return ok(None, message="View deleted")
