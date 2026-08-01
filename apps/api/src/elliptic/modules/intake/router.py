"""Admin endpoints to configure a project's public intake form."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.intake import service
from elliptic.modules.intake.schemas import IntakeStateOut, IntakeSubmitIn
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.tasks.schemas import TaskOut
from elliptic.modules.tasks.service import serialize_tasks

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/intake", tags=["intake"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


def _state(project: object) -> IntakeStateOut:
    return IntakeStateOut(
        intake_enabled=project.intake_enabled,  # type: ignore[attr-defined]
        intake_inapp_enabled=project.intake_inapp_enabled,  # type: ignore[attr-defined]
        intake_token=project.intake_token,  # type: ignore[attr-defined]
    )


@router.post("/enable")
async def enable_intake(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[IntakeStateOut]:
    project = await service.enable_intake(session, ctx, project_id)
    return ok(_state(project), message="Intake form enabled")


@router.post("/disable")
async def disable_intake(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[IntakeStateOut]:
    project = await service.disable_intake(session, ctx, project_id)
    return ok(_state(project), message="Intake form disabled")


@router.post("/inapp/enable")
async def enable_inapp_intake(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[IntakeStateOut]:
    project = await service.set_inapp_intake(session, ctx, project_id, True)
    return ok(_state(project), message="In-app intake enabled")


@router.post("/inapp/disable")
async def disable_inapp_intake(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[IntakeStateOut]:
    project = await service.set_inapp_intake(session, ctx, project_id, False)
    return ok(_state(project), message="In-app intake disabled")


@router.post("/submit")
async def submit_inapp_intake(
    project_id: uuid.UUID, payload: IntakeSubmitIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    """An in-app request from any member (incl. guests); lands in the triage queue."""
    task = await service.submit_inapp_intake(session, ctx, project_id, payload)
    project = await service.get_project_for_intake(session, ctx, project_id)
    serialized = await serialize_tasks(session, [task], project.key)
    return ok(serialized[0], message="Request submitted")
