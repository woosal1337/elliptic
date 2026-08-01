"""User profile schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdateIn(BaseModel):
    """Editable profile fields."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    locale: str | None = Field(default=None, min_length=2, max_length=10)


class PersonalAccessTokenCreateIn(BaseModel):
    """Payload to mint a personal access token."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    expires_in_days: int | None = Field(default=None, ge=1, le=365)


class PersonalAccessTokenOut(BaseModel):
    """A token's metadata (never the secret)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None
    prefix: str
    expires_at: datetime | None
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class PersonalAccessTokenCreatedOut(PersonalAccessTokenOut):
    """Returned once at creation, including the plaintext token."""

    token: str
