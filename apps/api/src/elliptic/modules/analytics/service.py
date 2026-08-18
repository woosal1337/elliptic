"""Analytics aggregation over work items (COS-26 core slice).

Read-only rollups across the org's (or one project's) tasks: totals by status
category, priority, and kind, plus a completion rate and an overdue count.
"""

import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.cycles.models import Cycle
from elliptic.modules.modules.models import Module
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import (
    STATUS_TO_CATEGORY,
    StatusCategory,
    Task,
    TaskKind,
    TaskPriority,
)

_OPEN_STATUSES = [
    s
    for s, c in STATUS_TO_CATEGORY.items()
    if c not in (StatusCategory.COMPLETED, StatusCategory.CANCELLED)
]
_CATEGORY_ORDER: dict[str, int] = {
    StatusCategory.BACKLOG.value: 0,
    StatusCategory.UNSTARTED.value: 1,
    StatusCategory.STARTED.value: 2,
}
_FORECAST_RECENT_WEEKS = 4


async def _assert_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    found = await session.scalar(
        select(Project.id).where(
            Project.id == project_id,
            Project.org_id == ctx.org.id,
            Project.deleted_at.is_(None),
        )
    )
    if found is None:
        raise NotFoundError("Project not found")


async def work_item_analytics(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID | None
) -> dict[str, object]:
    """Aggregate work-item analytics for the org, optionally scoped to one project."""
    base = [Task.org_id == ctx.org.id, Task.archived_at.is_(None)]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        base.append(Task.project_id == project_id)

    total = (await session.scalar(select(func.count()).select_from(Task).where(*base))) or 0

    status_rows = await session.execute(
        select(Task.status, func.count()).where(*base).group_by(Task.status)
    )
    by_category: dict[str, int] = {category.value: 0 for category in StatusCategory}
    completed = 0
    for status, count in status_rows:
        category = STATUS_TO_CATEGORY[status]
        by_category[category.value] += count
        if category is StatusCategory.COMPLETED:
            completed += count

    priority_rows = await session.execute(
        select(Task.priority, func.count()).where(*base).group_by(Task.priority)
    )
    by_priority: dict[str, int] = {priority.value: 0 for priority in TaskPriority}
    for priority, count in priority_rows:
        by_priority[priority.value] = count

    kind_rows = await session.execute(
        select(Task.kind, func.count()).where(*base).group_by(Task.kind)
    )
    by_kind: dict[str, int] = {kind.value: 0 for kind in TaskKind}
    for kind, count in kind_rows:
        by_kind[kind.value] = count

    overdue = (
        await session.scalar(
            select(func.count())
            .select_from(Task)
            .where(
                *base,
                Task.due_date.is_not(None),
                Task.due_date < utcnow().date(),
                Task.status.in_(_OPEN_STATUSES),
            )
        )
    ) or 0

    completion_rate = round(completed / total, 4) if total else 0.0
    return {
        "total": total,
        "completed": completed,
        "completion_rate": completion_rate,
        "overdue": overdue,
        "by_category": by_category,
        "by_priority": by_priority,
        "by_kind": by_kind,
    }


_CHART_DIMENSIONS = {
    "status": Task.status,
    "priority": Task.priority,
    "kind": Task.kind,
    "assignee": Task.assignee_id,
    "project": Task.project_id,
}


async def custom_chart(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    metric: str,
    dimension: str,
    project_id: uuid.UUID | None,
    status: str | None = None,
    priority: str | None = None,
) -> dict[str, object]:
    """Ad-hoc grouped aggregation: a metric (count|done|open) by a dimension (COS-57)."""
    column = _CHART_DIMENSIONS.get(dimension)
    if column is None:
        raise NotFoundError("Unknown dimension")
    base = [Task.org_id == ctx.org.id, Task.archived_at.is_(None)]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        base.append(Task.project_id == project_id)
    if status:
        base.append(Task.status == status)
    if priority:
        base.append(Task.priority == priority)

    completed = [s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.COMPLETED]
    if metric == "done":
        base.append(Task.status.in_(completed))
    elif metric == "open":
        base.append(Task.status.notin_(completed))

    rows = await session.execute(select(column, func.count()).where(*base).group_by(column))
    counted: list[tuple[str, int]] = [
        ((str(key) if key is not None else "unassigned"), int(value or 0)) for key, value in rows
    ]
    counted.sort(key=lambda pair: pair[1], reverse=True)
    points = [{"key": key, "value": value} for key, value in counted]
    return {"metric": metric, "dimension": dimension, "points": points}


async def throughput_forecast(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID | None, weeks: int = 8
) -> dict[str, object]:
    """Weekly completed throughput over the trailing ``weeks`` + a moving-average forecast.

    COS-194.

    Resolved counts come from accurate status_changed->done activity events.
    """
    weeks = max(2, min(weeks, 26))
    today = utcnow().date()
    start = today - timedelta(days=today.weekday() + 7 * (weeks - 1))

    filters = [
        ActivityEvent.org_id == ctx.org.id,
        ActivityEvent.entity_type == "task",
        ActivityEvent.event_type == "status_changed",
        ActivityEvent.payload["to"].astext == "done",
        func.date(ActivityEvent.created_at) >= start,
    ]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        filters.append(ActivityEvent.project_id == project_id)

    rows = await session.execute(
        select(func.date(ActivityEvent.created_at), func.count())
        .where(*filters)
        .group_by(func.date(ActivityEvent.created_at))
    )
    per_day = {row[0]: int(row[1]) for row in rows}

    weekly: list[dict[str, object]] = []
    counts: list[int] = []
    for index in range(weeks):
        week_start = start + timedelta(days=7 * index)
        total = sum(
            count
            for day, count in per_day.items()
            if week_start <= day < week_start + timedelta(days=7)
        )
        counts.append(total)
        weekly.append({"week_start": week_start.isoformat(), "completed": total})

    avg_per_week = round(sum(counts) / len(counts), 2) if counts else 0.0
    recent = counts[-_FORECAST_RECENT_WEEKS:] if len(counts) >= _FORECAST_RECENT_WEEKS else counts
    projected_next = round(sum(recent) / len(recent), 2) if recent else 0.0
    return {"weekly": weekly, "avg_per_week": avg_per_week, "projected_next_week": projected_next}


async def progress_scatter(
    session: AsyncSession, ctx: OrgContext, dimension: str, project_id: uuid.UUID | None
) -> dict[str, object]:
    """Per-cycle or per-module scope vs completion, for an outlier scatter plot (COS-46)."""
    entity: type[Cycle] | type[Module]
    if dimension == "cycle":
        entity, group_col = Cycle, Task.cycle_id
    elif dimension == "module":
        entity, group_col = Module, Task.module_id
    else:
        raise NotFoundError("Unknown dimension")

    name_by_id = {
        row[0]: row[1]
        for row in await session.execute(
            select(entity.id, entity.name).where(entity.org_id == ctx.org.id)
        )
    }
    completed = [s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.COMPLETED]
    base = [
        Task.org_id == ctx.org.id,
        Task.archived_at.is_(None),
        group_col.is_not(None),
    ]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        base.append(Task.project_id == project_id)

    rows = await session.execute(
        select(
            group_col,
            func.count(),
            func.count().filter(Task.status.in_(completed)),
        )
        .where(*base)
        .group_by(group_col)
    )
    points: list[dict[str, object]] = []
    for group_id, scope, done in rows:
        scope_n = int(scope or 0)
        done_n = int(done or 0)
        points.append(
            {
                "id": str(group_id),
                "name": name_by_id.get(group_id, "—"),
                "scope": scope_n,
                "completed": done_n,
                "completion_rate": round(done_n / scope_n, 3) if scope_n else 0.0,
            }
        )
    return {"dimension": dimension, "points": points}


async def member_workload(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID | None
) -> dict[str, object]:
    """Per-assignee capacity view: open WIP, started, and recent throughput (COS-75)."""
    base = [Task.org_id == ctx.org.id, Task.archived_at.is_(None)]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        base.append(Task.project_id == project_id)

    open_statuses = [s for s, c in STATUS_TO_CATEGORY.items() if c is not StatusCategory.COMPLETED]
    started = [s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.STARTED]
    completed = [s for s, c in STATUS_TO_CATEGORY.items() if c is StatusCategory.COMPLETED]
    cutoff = utcnow() - timedelta(days=30)

    rows = await session.execute(
        select(
            Task.assignee_id,
            func.count().filter(Task.status.in_(open_statuses)),
            func.count().filter(Task.status.in_(started)),
            func.count().filter(Task.status.in_(completed), Task.updated_at >= cutoff),
        )
        .where(*base, Task.assignee_id.is_not(None))
        .group_by(Task.assignee_id)
    )
    ranked: list[tuple[int, dict[str, object]]] = [
        (
            int(open_count or 0),
            {
                "assignee_id": str(assignee_id),
                "open": int(open_count or 0),
                "in_progress": int(started_count or 0),
                "completed_30d": int(done_count or 0),
            },
        )
        for assignee_id, open_count, started_count, done_count in rows
    ]
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return {"members": [entry for _, entry in ranked]}


async def pivot_table(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    row: str,
    col: str,
    project_id: uuid.UUID | None,
) -> dict[str, object]:
    """Cross-tabulate work-item counts across two dimensions (COS-119)."""
    row_col = _CHART_DIMENSIONS.get(row)
    col_col = _CHART_DIMENSIONS.get(col)
    if row_col is None or col_col is None:
        raise NotFoundError("Unknown dimension")
    base = [Task.org_id == ctx.org.id, Task.archived_at.is_(None)]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        base.append(Task.project_id == project_id)

    rows = await session.execute(
        select(row_col, col_col, func.count()).where(*base).group_by(row_col, col_col)
    )
    cells: dict[str, dict[str, int]] = {}
    row_keys: set[str] = set()
    col_keys: set[str] = set()
    for row_value, col_value, count in rows:
        rk = str(row_value) if row_value is not None else "unassigned"
        ck = str(col_value) if col_value is not None else "unassigned"
        row_keys.add(rk)
        col_keys.add(ck)
        cells.setdefault(rk, {})[ck] = int(count or 0)
    return {
        "row": row,
        "col": col,
        "row_keys": sorted(row_keys),
        "col_keys": sorted(col_keys),
        "cells": cells,
    }


async def flow_analytics(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID | None
) -> dict[str, object]:
    """Flow / bottleneck view: WIP and average age-in-status per status (COS-204).

    Age-in-status is the time since each open item last entered its current status
    (most recent status_changed event, falling back to its creation time).
    """
    base = [Task.org_id == ctx.org.id, Task.archived_at.is_(None)]
    if project_id is not None:
        await _assert_project(session, ctx, project_id)
        base.append(Task.project_id == project_id)
    base.append(Task.status.in_(_OPEN_STATUSES))

    rows = list(await session.execute(select(Task.id, Task.status, Task.created_at).where(*base)))
    task_ids = [row[0] for row in rows]
    entered: dict[uuid.UUID, object] = {}
    if task_ids:
        event_rows = await session.execute(
            select(ActivityEvent.entity_id, func.max(ActivityEvent.created_at))
            .where(
                ActivityEvent.org_id == ctx.org.id,
                ActivityEvent.entity_type == "task",
                ActivityEvent.event_type == "status_changed",
                ActivityEvent.entity_id.in_(task_ids),
            )
            .group_by(ActivityEvent.entity_id)
        )
        entered = {eid: ts for eid, ts in event_rows}  # noqa: C416

    now = utcnow()
    buckets: dict[str, dict[str, float]] = {}
    for task_id, status, created_at in rows:
        category = STATUS_TO_CATEGORY[status].value
        entered_at = entered.get(task_id, created_at)
        age_days = max(0.0, (now - entered_at).total_seconds() / 86400)  # type: ignore[operator]
        bucket = buckets.setdefault(category, {"wip": 0, "age_sum": 0.0})
        bucket["wip"] += 1
        bucket["age_sum"] += age_days

    statuses = [
        {
            "status": category,
            "wip": int(bucket["wip"]),
            "avg_age_days": round(bucket["age_sum"] / bucket["wip"], 2) if bucket["wip"] else 0.0,
        }
        for category, bucket in buckets.items()
    ]
    statuses.sort(key=lambda s: _CATEGORY_ORDER.get(str(s["status"]), 99))
    total_wip = sum(int(bucket["wip"]) for bucket in buckets.values())
    return {"statuses": statuses, "total_wip": total_wip}
