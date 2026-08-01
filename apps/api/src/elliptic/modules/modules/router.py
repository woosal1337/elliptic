"""Module (workstream) endpoints."""

import csv
import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from fastapi.responses import Response

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.modules import service
from elliptic.modules.modules.models import Module
from elliptic.modules.modules.schemas import ModuleCreateIn, ModuleOut, ModuleUpdateIn

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/modules", tags=["modules"])


def _csv_safe(value: str) -> str:
    """Neutralize spreadsheet formula injection in exported cells."""
    return f"'{value}" if value[:1] in ("=", "+", "-", "@") else value


def _to_out(module: Module, counts: dict[uuid.UUID, dict[str, int]]) -> ModuleOut:
    out = ModuleOut.model_validate(module)
    breakdown = counts.get(module.id, {})
    out.task_total = breakdown.get("total", 0)
    out.task_done = breakdown.get("done", 0)
    out.task_started = breakdown.get("started", 0)
    out.task_todo = breakdown.get("todo", 0)
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_module(
    project_id: uuid.UUID, payload: ModuleCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ModuleOut]:
    module = await service.create_module(session, ctx, project_id, payload)
    return ok(ModuleOut.model_validate(module), message="Module created")


@router.get("")
async def list_modules(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    include_archived: Annotated[bool, Query()] = False,
) -> SuccessResponse[list[ModuleOut]]:
    modules = await service.list_modules(
        session, ctx, project_id, include_archived=include_archived
    )
    counts = await service.module_counts(session, [m.id for m in modules])
    return ok([_to_out(m, counts) for m in modules])


@router.get("/summary")
async def modules_summary(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[dict[str, int]]:
    return ok(await service.modules_summary(session, ctx, project_id))


@router.patch("/{module_id}")
async def update_module(
    module_id: uuid.UUID, payload: ModuleUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ModuleOut]:
    module = await service.update_module(session, ctx, module_id, payload)
    counts = await service.module_counts(session, [module.id])
    return ok(_to_out(module, counts), message="Module updated")


@router.delete("/{module_id}")
async def delete_module(
    module_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_module(session, ctx, module_id)
    return ok(None, message="Module deleted")


@router.post("/{module_id}/archive")
async def archive_module(
    module_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ModuleOut]:
    module = await service.set_module_archived(session, ctx, module_id, True)
    counts = await service.module_counts(session, [module.id])
    return ok(_to_out(module, counts), message="Module archived")


@router.post("/{module_id}/restore")
async def restore_module(
    module_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ModuleOut]:
    module = await service.set_module_archived(session, ctx, module_id, False)
    counts = await service.module_counts(session, [module.id])
    return ok(_to_out(module, counts), message="Module restored")


@router.get("/{module_id}/export.csv")
async def export_module_csv(module_id: uuid.UUID, ctx: OrgCtx, session: SessionDep) -> Response:
    module, tasks = await service.module_export_rows(session, ctx, module_id)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["number", "title", "status", "priority", "kind", "assignee_id"])
    for task in tasks:
        writer.writerow(
            [
                task.number,
                _csv_safe(task.title),
                task.status.value,
                task.priority.value,
                task.kind.value,
                str(task.assignee_id) if task.assignee_id else "",
            ]
        )
    filename = f"module-{module.name[:40].strip() or module.id}.csv"
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{module_id}/tasks/{task_id}", status_code=status.HTTP_201_CREATED)
async def assign_task(
    module_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.assign_task(session, ctx, module_id, task_id)
    return ok(None, message="Task linked to module")


@router.delete("/{module_id}/tasks/{task_id}")
async def unassign_task(
    module_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unassign_task(session, ctx, module_id, task_id)
    return ok(None, message="Task unlinked from module")
