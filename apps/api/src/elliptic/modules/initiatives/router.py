"""Initiative endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.initiatives import service
from elliptic.modules.initiatives.models import Initiative
from elliptic.modules.initiatives.schemas import (
    InitiativeCreateIn,
    InitiativeOut,
    InitiativeProjectOut,
    InitiativeUpdateCreateIn,
    InitiativeUpdateIn,
    InitiativeUpdateOut,
)

router = APIRouter(prefix="/orgs/{org_id}/initiatives", tags=["initiatives"])


def _to_out(initiative: Initiative, rollups: dict[uuid.UUID, dict[str, float]]) -> InitiativeOut:
    out = InitiativeOut.model_validate(initiative)
    roll = rollups.get(initiative.id, {})
    out.project_count = int(roll.get("project_count", 0))
    out.task_total = int(roll.get("task_total", 0))
    out.task_done = int(roll.get("task_done", 0))
    out.task_started = int(roll.get("task_started", 0))
    out.task_todo = int(roll.get("task_todo", 0))
    out.weighted_total = round(roll.get("weighted_total", 0.0), 1)
    out.weighted_done = round(roll.get("weighted_done", 0.0), 1)
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_initiative(
    payload: InitiativeCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[InitiativeOut]:
    initiative = await service.create_initiative(session, ctx, payload)
    return ok(InitiativeOut.model_validate(initiative), message="Initiative created")


@router.get("")
async def list_initiatives(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[InitiativeOut]]:
    initiatives = await service.list_initiatives(session, ctx)
    rollups = await service.initiative_rollups(session, [i.id for i in initiatives])
    return ok([_to_out(i, rollups) for i in initiatives])


@router.patch("/{initiative_id}")
async def update_initiative(
    initiative_id: uuid.UUID, payload: InitiativeUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[InitiativeOut]:
    initiative = await service.update_initiative(session, ctx, initiative_id, payload)
    rollups = await service.initiative_rollups(session, [initiative.id])
    return ok(_to_out(initiative, rollups), message="Initiative updated")


@router.delete("/{initiative_id}")
async def delete_initiative(
    initiative_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_initiative(session, ctx, initiative_id)
    return ok(None, message="Initiative deleted")


@router.get("/{initiative_id}/updates")
async def list_initiative_updates(
    initiative_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[InitiativeUpdateOut]]:
    updates = await service.list_initiative_updates(session, ctx, initiative_id)
    return ok([InitiativeUpdateOut.model_validate(update) for update in updates])


@router.post("/{initiative_id}/updates", status_code=status.HTTP_201_CREATED)
async def create_initiative_update(
    initiative_id: uuid.UUID,
    payload: InitiativeUpdateCreateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[InitiativeUpdateOut]:
    update = await service.create_initiative_update(session, ctx, initiative_id, payload)
    return ok(InitiativeUpdateOut.model_validate(update), message="Update posted")


@router.get("/{initiative_id}/projects")
async def list_initiative_projects(
    initiative_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[InitiativeProjectOut]]:
    rows = await service.list_projects(session, ctx, initiative_id)
    return ok(
        [
            InitiativeProjectOut(
                id=project.id,
                name=project.name,
                key=project.key,
                task_total=total,
                task_done=done,
            )
            for project, total, done in rows
        ]
    )


@router.post("/{initiative_id}/projects/{project_id}", status_code=status.HTTP_201_CREATED)
async def add_initiative_project(
    initiative_id: uuid.UUID, project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.add_project(session, ctx, initiative_id, project_id)
    return ok(None, message="Project added to initiative")


@router.delete("/{initiative_id}/projects/{project_id}")
async def remove_initiative_project(
    initiative_id: uuid.UUID, project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.remove_project(session, ctx, initiative_id, project_id)
    return ok(None, message="Project removed from initiative")
