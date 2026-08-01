"""PQL schemas (COS-154)."""

import uuid
from datetime import date

from pydantic import BaseModel, Field


class PqlExecuteIn(BaseModel):
    """Run a PQL query over the workspace's tasks."""

    query: str = Field(min_length=1, max_length=2000)
    project_id: uuid.UUID | None = None


class PqlValidateIn(BaseModel):
    """Validate a PQL query without running it."""

    query: str = Field(min_length=1, max_length=2000)


class PqlTaskOut(BaseModel):
    """A compact task hit from a PQL query."""

    id: uuid.UUID
    identifier: str | None = None
    title: str
    status: str
    priority: str
    assignee_id: uuid.UUID | None = None
    due_date: date | None = None
    project_id: uuid.UUID


class PqlResultOut(BaseModel):
    """The result of a PQL execution."""

    query: str
    count: int
    results: list[PqlTaskOut]


class PqlValidateOut(BaseModel):
    """Whether a query is valid + an error message if not."""

    valid: bool
    error: str | None = None


class PqlFromTextIn(BaseModel):
    """Generate + run a PQL query from a natural-language request (COS-163)."""

    prompt: str = Field(min_length=1, max_length=500)


class PqlFromTextOut(BaseModel):
    """The generated query plus its results."""

    prompt: str
    query: str
    count: int
    results: list["PqlTaskOut"]
