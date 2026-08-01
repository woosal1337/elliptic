"""Unified search endpoint (COS-253)."""

from typing import Annotated

from fastapi import APIRouter, Query

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.search import service
from elliptic.modules.search.schemas import SearchOut, SearchResultOut

router = APIRouter(prefix="/orgs/{org_id}/search", tags=["search"])


@router.get("")
async def search(
    ctx: OrgCtx,
    session: SessionDep,
    q: Annotated[str, Query(min_length=1, max_length=200)],
    types: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SuccessResponse[SearchOut]:
    """Fuzzy search across tasks, notes, projects, meetings, cycles, and modules."""
    type_list = [t.strip() for t in types.split(",")] if types else None
    rows = await service.search(session, ctx, q, types=type_list, limit=limit)
    results = [SearchResultOut.model_validate(r) for r in rows]
    return ok(SearchOut(query=q, total=len(results), results=results))
