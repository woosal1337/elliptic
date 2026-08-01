"""RAID register / Decision Log / Risk Register models (COS-261)."""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class RegisterKind(enum.StrEnum):
    """The governance-register entry type (RAID + decisions)."""

    RISK = "risk"
    ASSUMPTION = "assumption"
    ISSUE = "issue"
    DEPENDENCY = "dependency"
    DECISION = "decision"


class RegisterStatus(enum.StrEnum):
    """Lifecycle of a register entry."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    MITIGATED = "mitigated"
    RESOLVED = "resolved"
    ACCEPTED = "accepted"
    CLOSED = "closed"


class RegisterEntry(BaseModel):
    """A typed governance-register entry attached to a project.

    Risks carry ``probability`` and ``impact`` (1-5); their product is the risk
    score. Decisions use the same row with kind=DECISION (title + rationale).
    """

    __tablename__ = "register_entries"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[RegisterKind] = mapped_column(Enum(RegisterKind, native_enum=False, length=20))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RegisterStatus] = mapped_column(
        Enum(RegisterStatus, native_enum=False, length=20), default=RegisterStatus.OPEN
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    probability: Mapped[int | None] = mapped_column(Integer, nullable=True)
    impact: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
