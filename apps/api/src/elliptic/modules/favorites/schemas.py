"""Favorite schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FavoriteCreateIn(BaseModel):
    """Payload to pin an entity to the user's favorites."""

    entity_type: str = Field(min_length=1, max_length=20)
    entity_id: uuid.UUID
    label: str = Field(min_length=1, max_length=255)


class FavoriteReorderIn(BaseModel):
    """Payload to set a favorite's sort position."""

    position: float


class FavoriteOut(BaseModel):
    """Serialized favorite."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    label: str
    position: float
    created_at: datetime
