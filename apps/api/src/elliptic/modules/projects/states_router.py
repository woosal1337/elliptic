"""Portfolio project-state endpoints (COS-240)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.projects import states_service as service
from elliptic.modules.projects.schemas import (
    ProjectStateIn,
    ProjectStateOut,
    ProjectStateUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/project-states", tags=["project-states"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("")
async def list_project_states(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ProjectStateOut]]:
    states = await service.list_project_states(session, ctx)
    return ok([ProjectStateOut.model_validate(state) for state in states])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project_state(
    payload: ProjectStateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[ProjectStateOut]:
    state = await service.create_project_state(
        session, ctx, name=payload.name, color=payload.color, group=payload.group
    )
    return ok(ProjectStateOut.model_validate(state), message="State created")


@router.patch("/{state_id}")
async def update_project_state(
    state_id: uuid.UUID, payload: ProjectStateUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[ProjectStateOut]:
    state = await service.update_project_state(
        session,
        ctx,
        state_id,
        name=payload.name,
        color=payload.color,
        group=payload.group,
        sort_order=payload.sort_order,
    )
    return ok(ProjectStateOut.model_validate(state), message="State updated")


@router.delete("/{state_id}")
async def delete_project_state(
    state_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_project_state(session, ctx, state_id)
    return ok(None, message="State deleted")
