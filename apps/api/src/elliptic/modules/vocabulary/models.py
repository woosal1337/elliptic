"""Org-scoped vocabulary term model."""

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class VocabularyTerm(BaseModel):
    """An org-specific term and its meaning, fed into AI prompt context."""

    __tablename__ = "vocabulary_terms"
    __table_args__ = (UniqueConstraint("org_id", "term"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    term: Mapped[str] = mapped_column(String(120))
    definition: Mapped[str] = mapped_column(Text)
