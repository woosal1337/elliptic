"""Per-user favorites: a polymorphic pin to any entity for quick access."""

import uuid

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class Favorite(BaseModel):
    """A user's pinned entity (task, project, note, view, cycle) within an org."""

    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "entity_type", "entity_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    entity_type: Mapped[str] = mapped_column(String(20))
    entity_id: Mapped[uuid.UUID] = mapped_column()
    label: Mapped[str] = mapped_column(String(255))
    position: Mapped[float] = mapped_column(Float, default=0.0)
