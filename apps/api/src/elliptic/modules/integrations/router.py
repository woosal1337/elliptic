"""Integration connection endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.integrations import service
from elliptic.modules.integrations.schemas import (
    SlackChannelOut,
    SlackConnectionOut,
    SlackOAuthIn,
)
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}", tags=["integrations"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("/integrations/slack")
async def slack_connection(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[SlackConnectionOut]:
    connection = await service.get_slack_connection(session, ctx)
    return ok(service.to_connection_out(connection))


@router.get("/integrations/slack/channels")
async def slack_channels(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[SlackChannelOut]]:
    channels = await service.list_slack_channels(session, ctx)
    return ok(channels)


@router.post("/integrations/slack/oauth-callback")
async def slack_oauth_callback(
    payload: SlackOAuthIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[SlackConnectionOut]:
    connection = await service.connect_slack(session, ctx, payload.code)
    return ok(service.to_connection_out(connection), message="Slack connected")
