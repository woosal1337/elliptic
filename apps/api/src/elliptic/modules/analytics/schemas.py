"""Analytics schemas."""

import uuid

from pydantic import BaseModel


class AnalyticsOverviewOut(BaseModel):
    """Work-item analytics rollup for the org or a single project."""

    total: int
    completed: int
    completion_rate: float
    overdue: int
    by_category: dict[str, int]
    by_priority: dict[str, int]
    by_kind: dict[str, int]


class FlowStatusOut(BaseModel):
    """WIP and average age-in-status for one status band."""

    status: str
    wip: int
    avg_age_days: float


class FlowAnalyticsOut(BaseModel):
    """Flow / bottleneck analytics across the open statuses."""

    statuses: list[FlowStatusOut]
    total_wip: int


class CustomChartPoint(BaseModel):
    """One grouped bucket of the custom chart (COS-57)."""

    key: str
    value: int


class CustomChartOut(BaseModel):
    """Ad-hoc analytics chart: a metric grouped by a dimension."""

    metric: str
    dimension: str
    points: list[CustomChartPoint]


class PivotTableOut(BaseModel):
    """Cross-tabulated counts across two dimensions (COS-119)."""

    row: str
    col: str
    row_keys: list[str]
    col_keys: list[str]
    cells: dict[str, dict[str, int]]


class MemberWorkloadRow(BaseModel):
    """One member's capacity snapshot (COS-75)."""

    assignee_id: uuid.UUID
    open: int
    in_progress: int
    completed_30d: int


class MemberWorkloadOut(BaseModel):
    """Per-member workload/capacity rollup."""

    members: list[MemberWorkloadRow]


class ThroughputForecastWeek(BaseModel):
    """Completed count for one trailing week (COS-194)."""

    week_start: str
    completed: int


class ThroughputForecastOut(BaseModel):
    """Weekly throughput history + a moving-average forecast."""

    weekly: list[ThroughputForecastWeek]
    avg_per_week: float
    projected_next_week: float


class ScatterPoint(BaseModel):
    """One cycle/module plotted by scope vs completion (COS-46)."""

    id: uuid.UUID
    name: str
    scope: int
    completed: int
    completion_rate: float


class ProgressScatterOut(BaseModel):
    """Scope-vs-completion scatter across cycles or modules."""

    dimension: str
    points: list[ScatterPoint]
