"""Cycle endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.cycles import service
from elliptic.modules.cycles.models import Cycle
from elliptic.modules.cycles.schemas import (
    ActiveCycleOut,
    CycleCreateIn,
    CycleOut,
    CycleTransferIn,
    CycleTransferOut,
    CycleUpdateIn,
    CycleVelocityOut,
    RecurringCyclesIn,
)

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/cycles", tags=["cycles"])
org_router = APIRouter(prefix="/orgs/{org_id}/cycles", tags=["cycles"])


@org_router.get("/active")
async def list_active_cycles(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ActiveCycleOut]]:
    rows = await service.list_active_cycles(session, ctx)
    counts = await service.cycle_counts(session, [cycle.id for cycle, _, _ in rows])
    result: list[ActiveCycleOut] = []
    for cycle, project_name, project_key in rows:
        out = ActiveCycleOut.model_validate(cycle)
        breakdown = counts.get(cycle.id)
        if breakdown is not None:
            out.task_total = breakdown["total"]
            out.task_done = breakdown["completed"]
            out.started = breakdown["started"]
            out.todo = breakdown["todo"]
        out.project_name = project_name
        out.project_key = project_key
        result.append(out)
    return ok(result)


def _to_out(cycle: Cycle, counts: dict[uuid.UUID, dict[str, int]]) -> CycleOut:
    out = CycleOut.model_validate(cycle)
    breakdown = counts.get(cycle.id)
    if breakdown is not None:
        out.task_total = breakdown["total"]
        out.task_done = breakdown["completed"]
        out.started = breakdown["started"]
        out.todo = breakdown["todo"]
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_cycle(
    project_id: uuid.UUID, payload: CycleCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CycleOut]:
    cycle = await service.create_cycle(session, ctx, project_id, payload)
    return ok(CycleOut.model_validate(cycle), message="Cycle created")


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_cycles(
    project_id: uuid.UUID, payload: RecurringCyclesIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[CycleOut]]:
    cycles = await service.generate_recurring_cycles(
        session,
        ctx,
        project_id,
        base_title=payload.base_title,
        count=payload.count,
        duration_weeks=payload.duration_weeks,
        cooldown_days=payload.cooldown_days,
        start_date=payload.start_date,
        start_index=payload.start_index,
    )
    return ok(
        [CycleOut.model_validate(cycle) for cycle in cycles],
        message=f"Generated {len(cycles)} cycles",
    )


@router.get("")
async def list_cycles(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[CycleOut]]:
    cycles = await service.list_cycles(session, ctx, project_id)
    counts = await service.cycle_counts(session, [cycle.id for cycle in cycles])
    return ok([_to_out(cycle, counts) for cycle in cycles])


@router.get("/velocity")
async def cycle_velocity(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CycleVelocityOut]:
    data = await service.cycle_velocity(session, ctx, project_id)
    return ok(CycleVelocityOut.model_validate(data))


@router.get("/{cycle_id}")
async def get_cycle(
    cycle_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CycleOut]:
    cycle = await service.get_cycle(session, ctx, cycle_id)
    counts = await service.cycle_counts(session, [cycle.id])
    return ok(_to_out(cycle, counts))


@router.patch("/{cycle_id}")
async def update_cycle(
    cycle_id: uuid.UUID,
    payload: CycleUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[CycleOut]:
    cycle = await service.update_cycle(session, ctx, cycle_id, payload)
    counts = await service.cycle_counts(session, [cycle.id])
    return ok(_to_out(cycle, counts), message="Cycle updated")


@router.delete("/{cycle_id}")
async def delete_cycle(
    cycle_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_cycle(session, ctx, cycle_id)
    return ok(None, message="Cycle deleted")


@router.post("/{cycle_id}/start")
async def start_cycle(
    cycle_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CycleOut]:
    cycle = await service.start_cycle(session, ctx, cycle_id)
    counts = await service.cycle_counts(session, [cycle.id])
    return ok(_to_out(cycle, counts), message="Cycle started")


@router.post("/{cycle_id}/complete")
async def complete_cycle(
    cycle_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CycleOut]:
    cycle = await service.complete_cycle(session, ctx, cycle_id)
    counts = await service.cycle_counts(session, [cycle.id])
    return ok(_to_out(cycle, counts), message="Cycle completed")


@router.post("/{cycle_id}/transfer")
async def transfer_incomplete(
    cycle_id: uuid.UUID, payload: CycleTransferIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CycleTransferOut]:
    moved = await service.transfer_incomplete(session, ctx, cycle_id, payload.target_cycle_id)
    return ok(CycleTransferOut(moved=moved), message="Incomplete items transferred")


@router.post("/{cycle_id}/tasks/{task_id}", status_code=status.HTTP_201_CREATED)
async def assign_task(
    cycle_id: uuid.UUID,
    task_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.assign_task(session, ctx, cycle_id, task_id)
    return ok(None, message="Task assigned to cycle")


@router.delete("/{cycle_id}/tasks/{task_id}")
async def unassign_task(
    cycle_id: uuid.UUID,
    task_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.unassign_task(session, ctx, cycle_id, task_id)
    return ok(None, message="Task removed from cycle")
