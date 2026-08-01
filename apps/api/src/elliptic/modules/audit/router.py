"""Compliance audit-log endpoints (admin-only)."""

import csv
import io
import json
import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from elliptic.core.deps import OrgContext, SessionDep, require_role
from elliptic.core.pagination import Page, PageParams, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.audit import service
from elliptic.modules.audit.schemas import AuditEntryOut
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/audit", tags=["audit"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]

ActorId = Annotated[uuid.UUID | None, Query()]
EntityType = Annotated[str | None, Query(max_length=50)]
EventType = Annotated[str | None, Query(max_length=50)]
StartDate = Annotated[date | None, Query()]
EndDate = Annotated[date | None, Query()]

_CSV_MAX_ROWS = 5000


@router.get("")
async def audit_log(
    ctx: AdminCtx,
    session: SessionDep,
    page: PageParamsDep,
    actor_id: ActorId = None,
    entity_type: EntityType = None,
    event_type: EventType = None,
    start_date: StartDate = None,
    end_date: EndDate = None,
) -> SuccessResponse[Page[AuditEntryOut]]:
    entries, total = await service.query_audit(
        session,
        ctx,
        page,
        actor_id=actor_id,
        entity_type=entity_type,
        event_type=event_type,
        start=start_date,
        end=end_date,
    )
    items = [AuditEntryOut.model_validate(entry) for entry in entries]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/export.csv")
async def export_csv(
    ctx: AdminCtx,
    session: SessionDep,
    actor_id: ActorId = None,
    entity_type: EntityType = None,
    event_type: EventType = None,
    start_date: StartDate = None,
    end_date: EndDate = None,
) -> Response:
    entries, _ = await service.query_audit(
        session,
        ctx,
        PageParams(limit=_CSV_MAX_ROWS, offset=0),
        actor_id=actor_id,
        entity_type=entity_type,
        event_type=event_type,
        start=start_date,
        end=end_date,
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["timestamp", "actor", "actor_type", "entity_type", "entity_id", "event", "changes"]
    )
    for entry in entries:
        writer.writerow(
            [
                entry["created_at"].isoformat(),
                entry["actor_name"],
                entry["actor_type"],
                entry["entity_type"],
                str(entry["entity_id"]),
                entry["event_type"],
                json.dumps(entry["changes"], default=str),
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="audit-log.csv"'},
    )
