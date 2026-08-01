"""Runner scripts: reusable code with cron scheduling + execution log (COS-251).

This module is the authoring/scheduling/history surface. Actual sandboxed
JS/TS execution is deferred to a dedicated isolated worker runtime (a security
decision pending, like media storage); manual triggers record a queued
execution that such a worker would pick up.
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class RunnerExecutionStatus(enum.StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class RunnerScript(BaseModel):
    """A reusable script with an optional cron schedule (COS-251)."""

    __tablename__ = "runner_scripts"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    language: Mapped[str] = mapped_column(String(20), default="javascript")
    code: Mapped[str] = mapped_column(Text, default="")
    cron_schedule: Mapped[str | None] = mapped_column(String(120), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=false())
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class RunnerExecution(BaseModel):
    """A single run of a script (manual or scheduled)."""

    __tablename__ = "runner_executions"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    script_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("runner_scripts.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[RunnerExecutionStatus] = mapped_column(
        Enum(RunnerExecutionStatus, native_enum=False, length=20),
        default=RunnerExecutionStatus.QUEUED,
        server_default=RunnerExecutionStatus.QUEUED.name,
    )
    trigger: Mapped[str] = mapped_column(String(20), default="manual")
    output: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
