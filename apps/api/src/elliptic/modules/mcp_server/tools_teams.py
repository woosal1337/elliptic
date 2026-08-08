"""Team read/write tools at parity with the web teams surface."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.teams import service as teams_service
from elliptic.modules.teams.schemas import (
    TeamCreateIn,
    TeamMemberOut,
    TeamOut,
    TeamUpdateIn,
)


@mcp.tool
async def list_teams(org_id: str | None = None) -> dict[str, Any]:
    """List the organization's teams.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:read", org_id=org_id) as call:
        teams = await teams_service.list_teams(call.session, call.ctx)
        items = [TeamOut.model_validate(team).model_dump(mode="json") for team in teams]
        return {"total": len(items), "items": items}


@mcp.tool
async def get_team(team_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one team by id.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:read", org_id=org_id) as call:
        team = await teams_service.get_team(call.session, call.ctx, uuid.UUID(team_id))
        return TeamOut.model_validate(team).model_dump(mode="json")


@mcp.tool
async def create_team(
    name: str,
    description: str | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a team with a unique name (admin/owner only, enforced by the service).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = TeamCreateIn(name=name, description=description)
            team = await teams_service.create_team(call.session, call.ctx, payload)
            return TeamOut.model_validate(team).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_team",
            producer=_produce,
        )


@mcp.tool
async def update_team(
    team_id: str,
    name: str | None = None,
    description: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update a team's name or description (admin/owner only, enforced by the service).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:write", org_id=org_id) as call:
        payload = TeamUpdateIn(name=name, description=description)
        team = await teams_service.update_team(call.session, call.ctx, uuid.UUID(team_id), payload)
        return TeamOut.model_validate(team).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_team(
    team_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a team. Call with confirm=false to preview, then confirm=true to delete.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:write", org_id=org_id) as call:
        team = await teams_service.get_team(call.session, call.ctx, uuid.UUID(team_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_team",
                "team_id": team_id,
                "name": team.name,
                "hint": "Re-call delete_team with confirm=true to permanently delete.",
            }
        await teams_service.delete_team(call.session, call.ctx, uuid.UUID(team_id))
        return {"deleted": True, "team_id": team_id}


@mcp.tool
async def list_team_members(team_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List the members of a team.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:read", org_id=org_id) as call:
        members = await teams_service.list_team_members(call.session, call.ctx, uuid.UUID(team_id))
        items = [TeamMemberOut.model_validate(member).model_dump(mode="json") for member in members]
        return {"total": len(items), "items": items}


@mcp.tool
async def add_team_member(team_id: str, user_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Add an existing org member to a team.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:write", org_id=org_id) as call:
        member = await teams_service.add_team_member(
            call.session, call.ctx, uuid.UUID(team_id), uuid.UUID(user_id)
        )
        return TeamMemberOut.model_validate(member).model_dump(mode="json")


@mcp.tool
async def remove_team_member(
    team_id: str, user_id: str, org_id: str | None = None
) -> dict[str, Any]:
    """Remove a member from a team.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("teams:write", org_id=org_id) as call:
        await teams_service.remove_team_member(
            call.session, call.ctx, uuid.UUID(team_id), uuid.UUID(user_id)
        )
        return {"removed": True, "team_id": team_id, "user_id": user_id}
