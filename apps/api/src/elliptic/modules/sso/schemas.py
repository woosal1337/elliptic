"""SSO schemas (COS-170)."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class SSOConnectionIn(BaseModel):
    """Configure an org's OIDC SSO connection (COS-170)."""

    domain: str = Field(min_length=3, max_length=255)
    issuer: str = Field(min_length=1, max_length=500)
    client_id: str = Field(min_length=1, max_length=500)
    client_secret: str | None = Field(default=None, max_length=500)
    redirect_uri: str = Field(min_length=1, max_length=1000)
    enabled: bool = True


class SSOConnectionOut(BaseModel):
    """An org's SSO connection (the client secret is never returned)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    domain: str
    issuer: str
    client_id: str
    redirect_uri: str
    enabled: bool


class SSOStartOut(BaseModel):
    authorization_url: str
