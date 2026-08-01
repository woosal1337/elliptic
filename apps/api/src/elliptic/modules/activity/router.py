"""Activity feed endpoints."""

import uuid

from fastapi import APIRouter

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.activity import service
from elliptic.modules.activity.schemas import ActivityEventOut

router = APIRouter(prefix="/orgs/{org_id}/activity", tags=["activity"])


@router.get("")
async def org_feed(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[ActivityEventOut]]:
    events, total = await service.list_org_feed(session, ctx, page)
    items = [ActivityEventOut.model_validate(event) for event in events]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/{entity_type}/{entity_id}")
async def entity_feed(
    entity_type: str,
    entity_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    page: PageParamsDep,
) -> SuccessResponse[Page[ActivityEventOut]]:
    events, total = await service.list_entity_feed(session, ctx, entity_type, entity_id, page)
    items = [ActivityEventOut.model_validate(event) for event in events]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))
