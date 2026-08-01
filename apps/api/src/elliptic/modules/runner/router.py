"""Runner endpoints (COS-251)."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.runner import service
from elliptic.modules.runner.schemas import (
    ExecutionOut,
    ScriptCreateIn,
    ScriptOut,
    ScriptUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/runner/scripts", tags=["runner"])


@router.get("")
async def list_scripts(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[ScriptOut]]:
    rows = await service.list_scripts(session, ctx)
    return ok([ScriptOut.model_validate(s) for s in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_script(
    payload: ScriptCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ScriptOut]:
    script = await service.create_script(
        session,
        ctx,
        name=payload.name,
        description=payload.description,
        language=payload.language,
        code=payload.code,
        cron_schedule=payload.cron_schedule,
    )
    return ok(ScriptOut.model_validate(script), message="Script created")


@router.patch("/{script_id}")
async def update_script(
    script_id: uuid.UUID, payload: ScriptUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ScriptOut]:
    script = await service.update_script(
        session,
        ctx,
        script_id,
        name=payload.name,
        description=payload.description,
        code=payload.code,
        cron_schedule=payload.cron_schedule,
        enabled=payload.enabled,
    )
    return ok(ScriptOut.model_validate(script))


@router.delete("/{script_id}")
async def delete_script(
    script_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_script(session, ctx, script_id)
    return ok(None, message="Script deleted")


@router.get("/{script_id}/executions")
async def list_executions(
    script_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ExecutionOut]]:
    rows = await service.list_executions(session, ctx, script_id)
    return ok([ExecutionOut.model_validate(e) for e in rows])


@router.post("/{script_id}/run", status_code=status.HTTP_201_CREATED)
async def run_script(
    script_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ExecutionOut]:
    execution = await service.trigger(session, ctx, script_id)
    return ok(ExecutionOut.model_validate(execution), message="Execution queued")
