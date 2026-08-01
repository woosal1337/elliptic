"""Unified multi-entity search schemas (COS-253)."""

import uuid

from pydantic import BaseModel


class SearchResultOut(BaseModel):
    """One ranked hit across the workspace."""

    type: str
    id: uuid.UUID
    title: str
    snippet: str | None = None
    project_id: uuid.UUID | None = None
    identifier: str | None = None
    score: float


class SearchOut(BaseModel):
    """Grouped + flat search results."""

    query: str
    total: int
    results: list[SearchResultOut]
