"""Instance-level settings singleton (COS-223)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, false, true
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class InstanceSettings(BaseModel):
    """A single row of instance-wide configuration (COS-223)."""

    __tablename__ = "instance_settings"

    instance_name: Mapped[str] = mapped_column(String(200), default="Elliptic")
    telemetry_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    allow_workspace_creation: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true()
    )
    email_from: Mapped[str | None] = mapped_column(String(255), nullable=True)
    air_gapped: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class InstanceLicense(BaseModel):
    """An activated offline license (signed, no phone-home) — COS-230."""

    __tablename__ = "instance_licenses"

    plan: Mapped[str] = mapped_column(String(20), default="enterprise")
    seats: Mapped[int] = mapped_column(default=0)
    licensee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    token: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
