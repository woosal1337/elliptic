"""Analytics endpoints (COS-26, COS-65)."""

import csv
import io
import uuid
from typing import Annotated, cast

from fastapi import APIRouter, Query
from fastapi.responses import Response

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.analytics import service
from elliptic.modules.analytics.schemas import (
    AnalyticsOverviewOut,
    CustomChartOut,
    FlowAnalyticsOut,
    MemberWorkloadOut,
    PivotTableOut,
    ThroughputForecastOut,
)

router = APIRouter(prefix="/orgs/{org_id}/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(
    ctx: OrgCtx,
    session: SessionDep,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[AnalyticsOverviewOut]:
    data = await service.work_item_analytics(session, ctx, project_id)
    return ok(AnalyticsOverviewOut.model_validate(data))


@router.get("/flow")
async def flow(
    ctx: OrgCtx,
    session: SessionDep,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[FlowAnalyticsOut]:
    data = await service.flow_analytics(session, ctx, project_id)
    return ok(FlowAnalyticsOut.model_validate(data))


@router.get("/custom")
async def custom_chart(
    ctx: OrgCtx,
    session: SessionDep,
    metric: Annotated[str, Query()] = "count",
    dimension: Annotated[str, Query()] = "status",
    project_id: Annotated[uuid.UUID | None, Query()] = None,
    chart_status: Annotated[str | None, Query(alias="status")] = None,
    priority: Annotated[str | None, Query()] = None,
) -> SuccessResponse[CustomChartOut]:
    data = await service.custom_chart(
        session,
        ctx,
        metric=metric,
        dimension=dimension,
        project_id=project_id,
        status=chart_status,
        priority=priority,
    )
    return ok(CustomChartOut.model_validate(data))


@router.get("/workload")
async def workload(
    ctx: OrgCtx,
    session: SessionDep,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[MemberWorkloadOut]:
    data = await service.member_workload(session, ctx, project_id)
    return ok(MemberWorkloadOut.model_validate(data))


@router.get("/forecast")
async def forecast(
    ctx: OrgCtx,
    session: SessionDep,
    weeks: Annotated[int, Query(ge=2, le=26)] = 8,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[ThroughputForecastOut]:
    data = await service.throughput_forecast(session, ctx, project_id, weeks)
    return ok(ThroughputForecastOut.model_validate(data))


@router.get("/pivot")
async def pivot(
    ctx: OrgCtx,
    session: SessionDep,
    row: Annotated[str, Query()] = "assignee",
    col: Annotated[str, Query()] = "status",
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[PivotTableOut]:
    data = await service.pivot_table(session, ctx, row=row, col=col, project_id=project_id)
    return ok(PivotTableOut.model_validate(data))


@router.get("/export.csv")
async def export_csv(
    ctx: OrgCtx,
    session: SessionDep,
    project_id: Annotated[uuid.UUID | None, Query()] = None,
) -> Response:
    """Export the analytics rollups as a long-format CSV (metric, dimension, value)."""
    data = await service.work_item_analytics(session, ctx, project_id)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["metric", "dimension", "value"])
    writer.writerow(["total", "", data["total"]])
    writer.writerow(["completed", "", data["completed"]])
    writer.writerow(["completion_rate", "", data["completion_rate"]])
    writer.writerow(["overdue", "", data["overdue"]])
    for group in ("by_category", "by_priority", "by_kind"):
        for dimension, value in cast("dict[str, int]", data[group]).items():
            writer.writerow([group, dimension, value])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="analytics.csv"'},
    )
