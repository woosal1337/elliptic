"""Customizable dashboards + chart widgets (COS-94)."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class DashboardVisibility(enum.StrEnum):
    """Who can view a dashboard (COS-134)."""

    PRIVATE = "private"
    WORKSPACE = "workspace"


class Dashboard(BaseModel):
    """A grid of chart widgets over workspace metrics (COS-94)."""

    __tablename__ = "dashboards"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), default="Untitled dashboard")
    filter: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    visibility: Mapped[DashboardVisibility] = mapped_column(
        Enum(DashboardVisibility, native_enum=False, length=20),
        default=DashboardVisibility.PRIVATE,
        server_default=DashboardVisibility.PRIVATE.name,
    )


class DashboardWidget(BaseModel):
    """One chart on a dashboard. ``config`` holds chart_type/metric/dimension/project_id."""

    __tablename__ = "dashboard_widgets"

    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dashboards.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), default="Chart")
    config: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    position: Mapped[int] = mapped_column(Integer, default=0)
