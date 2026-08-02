"""A record that something was deleted, so a delta feed can say so."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class DeletedEntity(BaseModel):
    """One row per user-facing deletion.

    Deliberately *not* a ``deleted_at`` column on the entity itself. Tasks and
    notes are the parents of 16 and 6 cascading foreign keys respectively, and
    both are self-referential — a real DELETE takes the children and the whole
    subtree with it, which is what the user asked for. Turning that into a flag
    would leave live children pointing at a row that is supposed to be gone,
    hold unique values hostage, and require a filter on every read in the
    codebase where a single omission silently resurrects deleted data.

    So the delete stays a delete, and the fact of it is recorded here in the
    same transaction. Clients ask for deletions since a cursor and drop their
    copies.
    """

    __tablename__ = "deleted_entities"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    #: Matches the collection names the sync endpoint serves: "tasks", "notes".
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[uuid.UUID] = mapped_column()
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
