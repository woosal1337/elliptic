"""Runner schemas (COS-251)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScriptCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    language: str = "javascript"
    code: str = Field(default="", max_length=100_000)
    cron_schedule: str | None = Field(default=None, max_length=120)


class ScriptUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    code: str | None = Field(default=None, max_length=100_000)
    cron_schedule: str | None = Field(default=None, max_length=120)
    enabled: bool | None = None


class ScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    language: str
    code: str
    cron_schedule: str | None
    enabled: bool
    created_at: datetime
    updated_at: datetime


class ExecutionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    script_id: uuid.UUID
    status: str
    trigger: str
    output: str | None
    error: str | None
    created_at: datetime
