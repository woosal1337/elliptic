"""Dashboard schemas (COS-94)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DashboardCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    filter: str | None = Field(default=None, max_length=2000)


class DashboardUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    filter: str | None = Field(default=None, max_length=2000)
    clear_filter: bool = False


class DashboardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    filter: str | None = None
    visibility: str = "private"
    created_at: datetime
    updated_at: datetime


class WidgetConfig(BaseModel):
    chart_type: str = "bar"
    metric: str = "count"
    dimension: str = "status"
    span: int = Field(default=1, ge=1, le=2)
    project_id: uuid.UUID | None = None
    filter: str | None = Field(default=None, max_length=2000)


class WidgetCreateIn(BaseModel):
    title: str = Field(default="Chart", max_length=200)
    config: WidgetConfig = Field(default_factory=WidgetConfig)


class WidgetUpdateIn(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    config: WidgetConfig | None = None
    position: int | None = Field(default=None, ge=0)


class WidgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dashboard_id: uuid.UUID
    title: str
    config: dict[str, object]
    position: int


class ChartPoint(BaseModel):
    key: str
    value: int


class WidgetData(BaseModel):
    widget_id: uuid.UUID
    chart_type: str
    points: list[ChartPoint]


class DashboardVisibilityIn(BaseModel):
    """Publish to / unpublish from the workspace (COS-134)."""

    visibility: str = Field(pattern="^(private|workspace)$")
