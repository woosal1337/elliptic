"""Initiative models — org-level strategic grouping above projects."""

import enum
import uuid
from datetime import date

from sqlalchemy import Column, Date, Enum, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import Base, BaseModel
from elliptic.modules.projects.models import ProjectHealth


class InitiativeStatus(enum.StrEnum):
    """Lifecycle state of an initiative."""

    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


initiative_projects = Table(
    "initiative_projects",
    Base.metadata,
    Column(
        "initiative_id",
        ForeignKey("initiatives.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    Column(
        "project_id",
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
)


class Initiative(BaseModel):
    """A cross-project strategic grouping owned by an organization."""

    __tablename__ = "initiatives"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[InitiativeStatus] = mapped_column(
        Enum(InitiativeStatus, native_enum=False, length=20), default=InitiativeStatus.ACTIVE
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class InitiativeUpdate(BaseModel):
    """A posted progress update on an initiative, with a RAG health and summary."""

    __tablename__ = "initiative_updates"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    initiative_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("initiatives.id", ondelete="CASCADE"), index=True
    )
    health: Mapped[ProjectHealth] = mapped_column(Enum(ProjectHealth, native_enum=False, length=20))
    summary: Mapped[str] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
