"""Dashboard + widget CRUD and data computation (COS-94)."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.dashboards.models import (
    Dashboard,
    DashboardVisibility,
    DashboardWidget,
)

if TYPE_CHECKING:
    from elliptic.modules.pql.parser import Node
    from elliptic.modules.tasks.models import Task

_METRICS = {"count", "done", "open"}
_DIMENSIONS = {"status", "priority", "kind", "assignee", "project"}
_CHART_TYPES = {"bar", "line", "area", "donut", "pie", "number", "table"}


def _clean_config(config: dict[str, object]) -> dict[str, object]:
    chart_type = str(config.get("chart_type", "bar"))
    metric = str(config.get("metric", "count"))
    dimension = str(config.get("dimension", "status"))
    span_raw = config.get("span", 1)
    span = span_raw if isinstance(span_raw, int) and span_raw in (1, 2) else 1
    cleaned: dict[str, object] = {
        "chart_type": chart_type if chart_type in _CHART_TYPES else "bar",
        "metric": metric if metric in _METRICS else "count",
        "dimension": dimension if dimension in _DIMENSIONS else "status",
        "span": span,
    }
    project_id = config.get("project_id")
    if project_id:
        cleaned["project_id"] = str(project_id)
    widget_filter = config.get("filter")
    if widget_filter:
        cleaned["filter"] = str(widget_filter)[:2000]
    return cleaned


async def list_dashboards(session: AsyncSession, ctx: OrgContext) -> list[Dashboard]:
    """The caller's own dashboards plus any published to the workspace (COS-134)."""
    result = await session.scalars(
        select(Dashboard)
        .where(
            Dashboard.org_id == ctx.org.id,
            or_(
                Dashboard.owner_id == ctx.user.id,
                Dashboard.visibility == DashboardVisibility.WORKSPACE,
            ),
        )
        .order_by(Dashboard.created_at)
    )
    return list(result)


async def create_dashboard(
    session: AsyncSession, ctx: OrgContext, name: str, filter_query: str | None = None
) -> Dashboard:
    dashboard = Dashboard(org_id=ctx.org.id, owner_id=ctx.user.id, name=name, filter=filter_query)
    session.add(dashboard)
    await session.flush()
    return dashboard


async def get_dashboard(
    session: AsyncSession, ctx: OrgContext, dashboard_id: uuid.UUID
) -> Dashboard:
    """Read access: the owner, or any member if it is published to the workspace."""
    dashboard = await session.scalar(
        select(Dashboard).where(
            Dashboard.id == dashboard_id,
            Dashboard.org_id == ctx.org.id,
            or_(
                Dashboard.owner_id == ctx.user.id,
                Dashboard.visibility == DashboardVisibility.WORKSPACE,
            ),
        )
    )
    if dashboard is None:
        raise NotFoundError("Dashboard not found")
    return dashboard


async def _owned_dashboard(
    session: AsyncSession, ctx: OrgContext, dashboard_id: uuid.UUID
) -> Dashboard:
    """Write access: only the dashboard's owner may mutate it (COS-134)."""
    dashboard = await session.scalar(
        select(Dashboard).where(
            Dashboard.id == dashboard_id,
            Dashboard.org_id == ctx.org.id,
            Dashboard.owner_id == ctx.user.id,
        )
    )
    if dashboard is None:
        raise NotFoundError("Dashboard not found")
    return dashboard


async def set_visibility(
    session: AsyncSession,
    ctx: OrgContext,
    dashboard_id: uuid.UUID,
    visibility: DashboardVisibility,
) -> Dashboard:
    """Publish to / unpublish from the workspace (owner only) — COS-134."""
    dashboard = await _owned_dashboard(session, ctx, dashboard_id)
    dashboard.visibility = visibility
    await session.flush()
    return dashboard


async def update_dashboard(
    session: AsyncSession,
    ctx: OrgContext,
    dashboard_id: uuid.UUID,
    *,
    name: str | None = None,
    filter_query: str | None = None,
    clear_filter: bool = False,
) -> Dashboard:
    dashboard = await _owned_dashboard(session, ctx, dashboard_id)
    if name is not None:
        dashboard.name = name
    if clear_filter:
        dashboard.filter = None
    elif filter_query is not None:
        dashboard.filter = filter_query
    await session.flush()
    return dashboard


async def delete_dashboard(session: AsyncSession, ctx: OrgContext, dashboard_id: uuid.UUID) -> None:
    dashboard = await _owned_dashboard(session, ctx, dashboard_id)
    await session.delete(dashboard)
    await session.flush()


async def list_widgets(
    session: AsyncSession, ctx: OrgContext, dashboard_id: uuid.UUID
) -> list[DashboardWidget]:
    await get_dashboard(session, ctx, dashboard_id)
    result = await session.scalars(
        select(DashboardWidget)
        .where(DashboardWidget.dashboard_id == dashboard_id)
        .order_by(DashboardWidget.position, DashboardWidget.created_at)
    )
    return list(result)


async def add_widget(
    session: AsyncSession,
    ctx: OrgContext,
    dashboard_id: uuid.UUID,
    *,
    title: str,
    config: dict[str, object],
) -> DashboardWidget:
    await _owned_dashboard(session, ctx, dashboard_id)
    existing = await list_widgets(session, ctx, dashboard_id)
    widget = DashboardWidget(
        dashboard_id=dashboard_id,
        title=title,
        config=_clean_config(config),
        position=len(existing),
    )
    session.add(widget)
    await session.flush()
    return widget


async def _get_widget(
    session: AsyncSession, ctx: OrgContext, dashboard_id: uuid.UUID, widget_id: uuid.UUID
) -> DashboardWidget:
    await _owned_dashboard(session, ctx, dashboard_id)
    widget = await session.scalar(
        select(DashboardWidget).where(
            DashboardWidget.id == widget_id, DashboardWidget.dashboard_id == dashboard_id
        )
    )
    if widget is None:
        raise NotFoundError("Widget not found")
    return widget


async def update_widget(
    session: AsyncSession,
    ctx: OrgContext,
    dashboard_id: uuid.UUID,
    widget_id: uuid.UUID,
    *,
    title: str | None,
    config: dict[str, object] | None,
    position: int | None,
) -> DashboardWidget:
    widget = await _get_widget(session, ctx, dashboard_id, widget_id)
    if title is not None:
        widget.title = title
    if config is not None:
        widget.config = _clean_config(config)
    if position is not None:
        widget.position = position
    await session.flush()
    return widget


async def delete_widget(
    session: AsyncSession, ctx: OrgContext, dashboard_id: uuid.UUID, widget_id: uuid.UUID
) -> None:
    widget = await _get_widget(session, ctx, dashboard_id, widget_id)
    await session.delete(widget)
    await session.flush()


def _compile(query: str | None) -> "Node | None":
    """Parse a PQL string, returning None if blank or invalid (filters fail open)."""
    from elliptic.modules.pql.executor import validate  # noqa: PLC0415
    from elliptic.modules.pql.parser import parse  # noqa: PLC0415

    if not query or not query.strip():
        return None
    try:
        node = parse(query)
        validate(node)
        return node
    except ValueError:
        return None


def _dimension_key(task: "Task", dimension: str) -> str:
    if dimension == "status":
        return task.status.value
    if dimension == "priority":
        return task.priority.value
    if dimension == "kind":
        return task.kind.value
    if dimension == "assignee":
        return str(task.assignee_id) if task.assignee_id else "unassigned"
    if dimension == "project":
        return str(task.project_id)
    return "other"


async def compute_data(
    session: AsyncSession,
    ctx: OrgContext,
    dashboard_id: uuid.UUID,
    header_query: str | None = None,
) -> list[dict[str, object]]:
    """Compute each widget's chart through the three-level PQL filter stack (COS-104).

    Tasks are filtered by dashboard-level AND header (ephemeral) AND per-widget
    PQL, with triage + archived items always excluded, then grouped in Python.
    """
    from elliptic.modules.pql.executor import evaluate  # noqa: PLC0415
    from elliptic.modules.tasks.models import (  # noqa: PLC0415
        STATUS_TO_CATEGORY,
        StatusCategory,
        Task,
    )

    dashboard = await get_dashboard(session, ctx, dashboard_id)
    widgets = await list_widgets(session, ctx, dashboard_id)
    today = utcnow().date()

    tasks = list(
        await session.scalars(
            select(Task)
            .options(selectinload(Task.labels))
            .where(
                Task.org_id == ctx.org.id,
                Task.is_triage.is_(False),
                Task.archived_at.is_(None),
            )
        )
    )

    dashboard_node = _compile(dashboard.filter)
    header_node = _compile(header_query)
    base = [
        task
        for task in tasks
        if (dashboard_node is None or evaluate(dashboard_node, task, today))
        and (header_node is None or evaluate(header_node, task, today))
    ]
    completed = {s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.COMPLETED}

    out: list[dict[str, object]] = []
    for widget in widgets:
        config = widget.config or {}
        metric = str(config.get("metric", "count"))
        dimension = str(config.get("dimension", "status"))
        project_raw = config.get("project_id")
        project_id = uuid.UUID(str(project_raw)) if project_raw else None
        widget_node = _compile(str(config.get("filter")) if config.get("filter") else None)

        counts: dict[str, int] = {}
        for task in base:
            if project_id is not None and task.project_id != project_id:
                continue
            if widget_node is not None and not evaluate(widget_node, task, today):
                continue
            if metric == "done" and task.status not in completed:
                continue
            if metric == "open" and task.status in completed:
                continue
            key = _dimension_key(task, dimension)
            counts[key] = counts.get(key, 0) + 1

        points = sorted(
            ({"key": k, "value": v} for k, v in counts.items()),
            key=lambda p: p["value"],  # type: ignore[arg-type,return-value]
            reverse=True,
        )
        out.append(
            {
                "widget_id": widget.id,
                "chart_type": config.get("chart_type", "bar"),
                "points": points,
            }
        )
    return out
