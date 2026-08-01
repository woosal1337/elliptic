"""MCP connector schemas (COS-228)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConnectorCreateIn(BaseModel):
    catalog_key: str = Field(min_length=1, max_length=50)
    endpoint_url: str | None = Field(default=None, max_length=1000)
    credential: str | None = Field(default=None, max_length=2000)
    header_name: str | None = Field(default=None, max_length=100)


class ConnectorOut(BaseModel):
    """A configured connector (the credential is never returned)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    catalog_key: str
    display_name: str
    transport: str
    endpoint_url: str
    auth_type: str
    enabled: bool
    created_at: datetime


class ConnectorEnabledIn(BaseModel):
    enabled: bool


class RemoteTool(BaseModel):
    name: str
    description: str


class TestConnectionOut(BaseModel):
    ok: bool
    tools: list[RemoteTool]
    error: str | None
