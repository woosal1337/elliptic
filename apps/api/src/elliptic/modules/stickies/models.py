"""Sticky models — a personal floating scratchpad of color-coded notes."""

import uuid

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class Sticky(BaseModel):
    """A short, color-coded personal note owned by one user within an org."""

    __tablename__ = "stickies"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(20), default="yellow")
    position: Mapped[float] = mapped_column(Float, default=0.0)
