"""Delta sync endpoint."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.sync import service
from elliptic.modules.sync.schemas import ChangesOut, SyncedRow

router = APIRouter(prefix="/orgs/{org_id}/sync", tags=["sync"])


@router.get("/changes")
async def list_changes(
    ctx: OrgCtx,
    session: SessionDep,
    since: Annotated[
        datetime | None,
        Query(description="Cursor from the previous reply. Omit for a full bootstrap."),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_LIMIT)] = service.DEFAULT_LIMIT,
    kinds: Annotated[
        str | None,
        Query(description="Comma-separated collections, e.g. tasks,notes. Default: all."),
    ] = None,
) -> SuccessResponse[ChangesOut]:
    """What changed in this organisation since `since`.

    Omitting `since` bootstraps: every live row, no tombstones, since a client
    with no local copy has nothing to forget.
    """
    requested = [k.strip() for k in kinds.split(",") if k.strip()] if kinds else None
    try:
        changes = await service.changes_since(
            session, ctx, since=since, limit=limit, kinds=requested
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    return ok(
        ChangesOut(
            cursor=changes.cursor,
            has_more=changes.has_more,
            changes={
                kind: [SyncedRow.model_validate(row) for row in rows]
                for kind, rows in changes.collections.items()
            },
            deletions=changes.deletions,
        )
    )
