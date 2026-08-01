"""Marketplace endpoints (COS-273)."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.marketplace import service

router = APIRouter(prefix="/orgs/{org_id}/marketplace", tags=["marketplace"])


@router.get("/catalog")
async def get_catalog(
    ctx: OrgCtx,  # noqa: ARG001  (auth/scoping dependency)
    category: Annotated[str | None, Query()] = None,
) -> SuccessResponse[list[dict[str, str]]]:
    """The curated marketplace catalog, optionally filtered by category (COS-273)."""
    return ok(service.catalog(category))


@router.get("/catalog/{item_id}")
async def get_item(
    item_id: str,
    ctx: OrgCtx,  # noqa: ARG001  (auth/scoping dependency)
) -> SuccessResponse[dict[str, str]]:
    item = next((i for i in service.catalog() if i["id"] == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return ok(item)


@router.get("/installed")
async def get_installed(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[dict[str, object]]:
    """What is installed/active in this workspace (COS-273)."""
    return ok(await service.installed(session, ctx))
