"""Limit/offset pagination parameters and paged response model."""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query
from pydantic import BaseModel


@dataclass(frozen=True)
class PageParams:
    """Validated limit/offset pagination parameters."""

    limit: int
    offset: int


def page_params(
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PageParams:
    """Dependency producing pagination parameters."""
    return PageParams(limit=limit, offset=offset)


PageParamsDep = Annotated[PageParams, Depends(page_params)]


class Page[T](BaseModel):
    """A page of items with total count and the applied window."""

    items: list[T]
    total: int
    limit: int
    offset: int
