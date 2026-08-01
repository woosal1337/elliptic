"""Custom property schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.properties.models import PropertyType


class CustomPropertyCreateIn(BaseModel):
    """Payload to define a custom property."""

    name: str = Field(min_length=1, max_length=100)
    type: PropertyType
    options: list[str] = Field(default_factory=list)


class CustomPropertyOut(BaseModel):
    """Serialized custom property definition."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    type: PropertyType
    options: list[str]
    created_at: datetime


class PropertyTemplateOut(BaseModel):
    """A workspace-level property template (COS-88)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: PropertyType
    options: list[str]
