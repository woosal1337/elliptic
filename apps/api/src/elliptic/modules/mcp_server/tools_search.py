"""Unified search across the workspace."""

from typing import Any

from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.search import service as search_service
from elliptic.modules.search.schemas import SearchOut, SearchResultOut

SEARCH_TYPES = ("task", "note", "project", "meeting")


@mcp.tool
async def search(
    query: str,
    types: str | None = None,
    limit: int = 20,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Find anything in the workspace by name or content, ranked by relevance.

    This is the fastest way to locate a record you only know by description —
    reach for it before listing and filtering an entity type by hand. Each hit
    carries the type, the id to pass to the matching get_* tool, and, for tasks,
    the human identifier such as ENG-42.

    types is an optional comma-separated filter drawn from: task, note, project,
    meeting. Omit it to search all four.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("brain:read", org_id=org_id) as call:
        wanted = [item.strip() for item in types.split(",") if item.strip()] if types else None
        if wanted:
            unknown = sorted(set(wanted) - set(SEARCH_TYPES))
            if unknown:
                raise ValueError(
                    f"Unknown search types {unknown}; choose from {list(SEARCH_TYPES)}"
                )
        rows = await search_service.search(call.session, call.ctx, query, types=wanted, limit=limit)
        results = [SearchResultOut.model_validate(row) for row in rows]
        return SearchOut(query=query, total=len(results), results=results).model_dump(mode="json")
