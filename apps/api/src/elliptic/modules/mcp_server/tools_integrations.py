"""Slack integration tools mirroring the integrations router."""

import uuid
from typing import Any

from elliptic.modules.integrations import service as integrations_service
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call


@mcp.tool
async def get_slack_integration(org_id: str | None = None) -> dict[str, Any]:
    """Report whether the org has Slack connected, with the workspace name.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("integrations:read", org_id=org_id) as call:
        connection = await integrations_service.get_slack_connection(call.session, call.ctx)
        return integrations_service.to_connection_out(connection).model_dump(mode="json")


@mcp.tool
async def list_slack_channels(org_id: str | None = None) -> dict[str, Any]:
    """List the connected Slack workspace's channels.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("integrations:read", org_id=org_id) as call:
        channels = await integrations_service.list_slack_channels(call.session, call.ctx)
        items = [channel.model_dump(mode="json") for channel in channels]
        return {"total": len(items), "items": items}


@mcp.tool
async def post_meeting_to_slack(
    meeting_id: str, channel_id: str, org_id: str | None = None
) -> dict[str, Any]:
    """Post a meeting's summary and action items to a Slack channel.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("integrations:manage", org_id=org_id) as call:
        ok_result = await integrations_service.send_meeting_to_slack(
            call.session, call.ctx, uuid.UUID(meeting_id), channel_id
        )
        return {"ok": ok_result, "meeting_id": meeting_id, "channel_id": channel_id}
