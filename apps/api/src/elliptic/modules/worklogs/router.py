"""Worklog (time tracking) endpoints."""

import csv
import io
import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.worklogs import service
from elliptic.modules.worklogs.schemas import (
    WorklogCreateIn,
    WorklogDecisionIn,
    WorklogListOut,
    WorklogOut,
)

router = APIRouter(prefix="/orgs/{org_id}", tags=["worklogs"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


def _csv_safe(value: str) -> str:
    """Neutralize spreadsheet formula injection in exported cells."""
    return f"'{value}" if value[:1] in ("=", "+", "-", "@") else value


@router.post("/tasks/{task_id}/worklogs", status_code=status.HTTP_201_CREATED)
async def create_worklog(
    task_id: uuid.UUID, payload: WorklogCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorklogOut]:
    worklog = await service.create_worklog(session, ctx, task_id, payload)
    return ok(WorklogOut.model_validate(worklog), message="Time logged")


@router.get("/tasks/{task_id}/worklogs")
async def list_worklogs(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorklogListOut]:
    entries, total = await service.list_worklogs(session, ctx, task_id)
    return ok(
        WorklogListOut(
            entries=[WorklogOut.model_validate(entry) for entry in entries],
            total_minutes=total,
        )
    )


@router.delete("/tasks/{task_id}/worklogs/{worklog_id}")
async def delete_worklog(
    task_id: uuid.UUID, worklog_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_worklog(session, ctx, task_id, worklog_id)
    return ok(None, message="Worklog deleted")


@router.get("/projects/{project_id}/worklogs/summary")
async def project_worklog_summary(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[dict[str, int]]:
    total = await service.project_logged_minutes(session, ctx, project_id)
    return ok({"total_minutes": total})


@router.get("/projects/{project_id}/worklogs/pending")
async def list_pending_worklogs(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[list[WorklogOut]]:
    entries = await service.list_pending_worklogs(session, ctx, project_id)
    return ok([WorklogOut.model_validate(entry) for entry in entries])


@router.post("/worklogs/{worklog_id}/approve")
async def approve_worklog(
    worklog_id: uuid.UUID, payload: WorklogDecisionIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[WorklogOut]:
    worklog = await service.decide_worklog(
        session, ctx, worklog_id, approve=True, note=payload.note
    )
    return ok(WorklogOut.model_validate(worklog), message="Worklog approved")


@router.post("/worklogs/{worklog_id}/reject")
async def reject_worklog(
    worklog_id: uuid.UUID, payload: WorklogDecisionIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[WorklogOut]:
    worklog = await service.decide_worklog(
        session, ctx, worklog_id, approve=False, note=payload.note
    )
    return ok(WorklogOut.model_validate(worklog), message="Worklog rejected")


@router.get("/projects/{project_id}/worklogs/export.csv")
async def export_project_worklogs_csv(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    user_id: Annotated[uuid.UUID | None, Query()] = None,
) -> Response:
    rows = await service.project_worklog_export_rows(
        session, ctx, project_id, start=start_date, end=end_date, user_id=user_id
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["logged_at", "task", "logged_by", "minutes", "note"])
    for row in rows:
        writer.writerow(
            [
                row["logged_at"],
                row["task"],
                _csv_safe(str(row["logged_by"])),
                row["minutes"],
                _csv_safe(str(row["note"])),
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="worklogs.csv"'},
    )
