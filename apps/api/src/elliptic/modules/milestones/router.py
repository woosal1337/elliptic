"""Milestone endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.milestones import service
from elliptic.modules.milestones.models import Milestone
from elliptic.modules.milestones.schemas import (
    MilestoneCreateIn,
    MilestoneLinkResult,
    MilestoneOut,
    MilestoneTaskBulkIn,
    MilestoneUpdateIn,
)
from elliptic.modules.tasks import service as tasks_service
from elliptic.modules.tasks.schemas import TaskOut

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/milestones", tags=["milestones"])


def _to_out(milestone: Milestone, counts: dict[uuid.UUID, dict[str, int]]) -> MilestoneOut:
    out = MilestoneOut.model_validate(milestone)
    breakdown = counts.get(milestone.id, {})
    out.task_total = breakdown.get("total", 0)
    out.task_done = breakdown.get("done", 0)
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_milestone(
    project_id: uuid.UUID, payload: MilestoneCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MilestoneOut]:
    milestone = await service.create_milestone(session, ctx, project_id, payload)
    return ok(MilestoneOut.model_validate(milestone), message="Milestone created")


@router.get("")
async def list_milestones(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[MilestoneOut]]:
    milestones = await service.list_milestones(session, ctx, project_id)
    counts = await service.milestone_counts(session, [m.id for m in milestones])
    return ok([_to_out(m, counts) for m in milestones])


@router.patch("/{milestone_id}")
async def update_milestone(
    milestone_id: uuid.UUID, payload: MilestoneUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MilestoneOut]:
    milestone = await service.update_milestone(session, ctx, milestone_id, payload)
    counts = await service.milestone_counts(session, [milestone.id])
    return ok(_to_out(milestone, counts), message="Milestone updated")


@router.delete("/{milestone_id}")
async def delete_milestone(
    milestone_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_milestone(session, ctx, milestone_id)
    return ok(None, message="Milestone deleted")


@router.post("/{milestone_id}/tasks/bulk", status_code=status.HTTP_201_CREATED)
async def assign_tasks_bulk(
    milestone_id: uuid.UUID, payload: MilestoneTaskBulkIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[MilestoneLinkResult]]:
    results = await service.assign_tasks_bulk(session, ctx, milestone_id, payload.task_ids)
    return ok(
        [MilestoneLinkResult.model_validate(result) for result in results],
        message="Tasks linked",
    )


@router.get("/{milestone_id}/tasks")
async def list_milestone_tasks(
    milestone_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskOut]]:
    tasks, project_key = await service.list_milestone_tasks(session, ctx, milestone_id)
    return ok(await tasks_service.serialize_tasks(session, tasks, project_key))


@router.post("/{milestone_id}/tasks/{task_id}", status_code=status.HTTP_201_CREATED)
async def assign_task(
    milestone_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.assign_task(session, ctx, milestone_id, task_id)
    return ok(None, message="Task linked to milestone")


@router.delete("/{milestone_id}/tasks/{task_id}")
async def unassign_task(
    milestone_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unassign_task(session, ctx, milestone_id, task_id)
    return ok(None, message="Task unlinked from milestone")
