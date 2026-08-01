"""Vocabulary schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VocabularyCreateIn(BaseModel):
    """Payload to add a vocabulary term."""

    term: str = Field(min_length=1, max_length=120)
    definition: str = Field(min_length=1, max_length=2000)


class VocabularyUpdateIn(BaseModel):
    """Editable vocabulary fields."""

    term: str | None = Field(default=None, min_length=1, max_length=120)
    definition: str | None = Field(default=None, min_length=1, max_length=2000)


class VocabularyOut(BaseModel):
    """Serialized vocabulary term."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    term: str
    definition: str
    created_at: datetime
    updated_at: datetime
