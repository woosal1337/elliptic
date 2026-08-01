"""RBAC audit trail endpoints (admin-only compliance view + CSV export)."""

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
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.rbac_audit import service
from elliptic.modules.rbac_audit.models import RbacAction, RbacResourceScope
from elliptic.modules.rbac_audit.schemas import RbacAuditOut

router = APIRouter(prefix="/orgs/{org_id}/rbac-audit", tags=["rbac-audit"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]

ActorId = Annotated[uuid.UUID | None, Query()]
SubjectId = Annotated[uuid.UUID | None, Query()]
Scope = Annotated[RbacResourceScope | None, Query()]
Action = Annotated[RbacAction | None, Query()]
StartDate = Annotated[date | None, Query()]
EndDate = Annotated[date | None, Query()]

_CSV_MAX_ROWS = 5000


@router.get("")
async def rbac_audit_log(
    ctx: AdminCtx,
    session: SessionDep,
    page: PageParamsDep,
    actor_id: ActorId = None,
    subject_user_id: SubjectId = None,
    resource_scope: Scope = None,
    action: Action = None,
    start_date: StartDate = None,
    end_date: EndDate = None,
) -> SuccessResponse[Page[RbacAuditOut]]:
    entries, total = await service.query_rbac_audit(
        session,
        ctx,
        page,
        actor_id=actor_id,
        subject_user_id=subject_user_id,
        resource_scope=resource_scope,
        action=action,
        start=start_date,
        end=end_date,
    )
    items = [RbacAuditOut.model_validate(entry) for entry in entries]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/export.csv")
async def export_csv(
    ctx: AdminCtx,
    session: SessionDep,
    actor_id: ActorId = None,
    subject_user_id: SubjectId = None,
    resource_scope: Scope = None,
    action: Action = None,
    start_date: StartDate = None,
    end_date: EndDate = None,
) -> Response:
    entries, _ = await service.query_rbac_audit(
        session,
        ctx,
        PageParams(limit=_CSV_MAX_ROWS, offset=0),
        actor_id=actor_id,
        subject_user_id=subject_user_id,
        resource_scope=resource_scope,
        action=action,
        start=start_date,
        end=end_date,
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "timestamp",
            "actor",
            "actor_type",
            "subject",
            "scope",
            "resource_id",
            "action",
            "role_before",
            "role_after",
            "detail",
        ]
    )
    for entry in entries:
        writer.writerow(
            [
                entry["created_at"].isoformat(),
                entry["actor_name"],
                entry["actor_type"],
                entry["subject_name"] or "",
                entry["resource_scope"],
                str(entry["resource_id"]),
                entry["action"],
                entry["role_before"] or "",
                entry["role_after"] or "",
                json.dumps(entry["detail"], default=str) if entry["detail"] else "",
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="rbac-audit.csv"'},
    )
