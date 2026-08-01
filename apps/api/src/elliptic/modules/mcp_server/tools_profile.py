"""Current-user profile tools mirroring the /users/me router."""

from typing import Any

from elliptic.modules.auth.schemas import UserOut
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.users import service as users_service
from elliptic.modules.users.schemas import ProfileUpdateIn


@mcp.tool
async def get_my_profile() -> dict[str, Any]:
    """Fetch the current user's profile."""
    async with mcp_call("profile:read") as call:
        return UserOut.model_validate(call.ctx.user).model_dump(mode="json")


@mcp.tool
async def update_my_profile(full_name: str | None = None) -> dict[str, Any]:
    """Update the current user's profile (full name)."""
    async with mcp_call("profile:write") as call:
        payload = ProfileUpdateIn(full_name=full_name)
        updated = await users_service.update_profile(call.session, call.ctx.user, payload)
        return UserOut.model_validate(updated).model_dump(mode="json")
