"""Dashboard endpoints (COS-94)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from fastapi.responses import HTMLResponse

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.dashboards import export, service
from elliptic.modules.dashboards.schemas import (
    DashboardCreateIn,
    DashboardOut,
    DashboardUpdateIn,
    DashboardVisibilityIn,
    WidgetCreateIn,
    WidgetData,
    WidgetOut,
    WidgetUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/dashboards", tags=["dashboards"])


@router.get("")
async def list_dashboards(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[DashboardOut]]:
    rows = await service.list_dashboards(session, ctx)
    return ok([DashboardOut.model_validate(d) for d in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    payload: DashboardCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DashboardOut]:
    dashboard = await service.create_dashboard(session, ctx, payload.name, payload.filter)
    return ok(DashboardOut.model_validate(dashboard), message="Dashboard created")


@router.get("/{dashboard_id}")
async def get_dashboard(
    dashboard_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DashboardOut]:
    dashboard = await service.get_dashboard(session, ctx, dashboard_id)
    return ok(DashboardOut.model_validate(dashboard))


@router.patch("/{dashboard_id}")
async def update_dashboard(
    dashboard_id: uuid.UUID, payload: DashboardUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DashboardOut]:
    dashboard = await service.update_dashboard(
        session,
        ctx,
        dashboard_id,
        name=payload.name,
        filter_query=payload.filter,
        clear_filter=payload.clear_filter,
    )
    return ok(DashboardOut.model_validate(dashboard))


@router.patch("/{dashboard_id}/visibility")
async def set_visibility(
    dashboard_id: uuid.UUID, payload: DashboardVisibilityIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DashboardOut]:
    """Publish a dashboard to the workspace or make it private again (COS-134)."""
    from elliptic.modules.dashboards.models import DashboardVisibility  # noqa: PLC0415

    dashboard = await service.set_visibility(
        session, ctx, dashboard_id, DashboardVisibility(payload.visibility)
    )
    return ok(DashboardOut.model_validate(dashboard), message="Visibility updated")


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_dashboard(session, ctx, dashboard_id)
    return ok(None, message="Dashboard deleted")


@router.get("/{dashboard_id}/widgets")
async def list_widgets(
    dashboard_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[WidgetOut]]:
    rows = await service.list_widgets(session, ctx, dashboard_id)
    return ok([WidgetOut.model_validate(w) for w in rows])


@router.post("/{dashboard_id}/widgets", status_code=status.HTTP_201_CREATED)
async def add_widget(
    dashboard_id: uuid.UUID, payload: WidgetCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WidgetOut]:
    widget = await service.add_widget(
        session,
        ctx,
        dashboard_id,
        title=payload.title,
        config=payload.config.model_dump(mode="json"),
    )
    return ok(WidgetOut.model_validate(widget), message="Widget added")


@router.patch("/{dashboard_id}/widgets/{widget_id}")
async def update_widget(
    dashboard_id: uuid.UUID,
    widget_id: uuid.UUID,
    payload: WidgetUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[WidgetOut]:
    widget = await service.update_widget(
        session,
        ctx,
        dashboard_id,
        widget_id,
        title=payload.title,
        config=payload.config.model_dump(mode="json") if payload.config else None,
        position=payload.position,
    )
    return ok(WidgetOut.model_validate(widget))


@router.delete("/{dashboard_id}/widgets/{widget_id}")
async def delete_widget(
    dashboard_id: uuid.UUID, widget_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_widget(session, ctx, dashboard_id, widget_id)
    return ok(None, message="Widget removed")


@router.get("/{dashboard_id}/data")
async def dashboard_data(
    dashboard_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=2000)] = None,
) -> SuccessResponse[list[WidgetData]]:
    """Compute widget data, optionally narrowed by an ephemeral header PQL `q` (COS-104)."""
    rows = await service.compute_data(session, ctx, dashboard_id, header_query=q)
    return ok([WidgetData.model_validate(r) for r in rows])


@router.get("/{dashboard_id}/export.html", response_class=HTMLResponse)
async def export_dashboard(
    dashboard_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> HTMLResponse:
    """A printable HTML rendering of the dashboard for PDF export (COS-139)."""
    markup = await export.render_dashboard_html(session, ctx, dashboard_id)
    return HTMLResponse(content=markup)
