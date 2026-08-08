"""AI agent (AIUser) management tools — the 'manage the agents you run' surface."""

import uuid
from typing import Any, Literal

from mcp.types import ToolAnnotations

from elliptic.core.pagination import PageParams
from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.models import AIProviderType
from elliptic.modules.ai.schemas import (
    AIKeyCreateIn,
    AIKeyOut,
    AIKeyUpdateIn,
    AIRunOut,
    AIUserCreateIn,
    AIUserOut,
    AIUserUpdateIn,
)
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call


@mcp.tool
async def list_ai_users(org_id: str | None = None) -> dict[str, Any]:
    """List the organization's AI agents (personas).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:read", org_id=org_id) as call:
        agents = await ai_service.list_ai_users(call.session, call.ctx)
        return {
            "items": [AIUserOut.model_validate(agent).model_dump(mode="json") for agent in agents]
        }


@mcp.tool
async def get_ai_user(ai_user_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one AI agent.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:read", org_id=org_id) as call:
        agent = await ai_service.get_ai_user(call.session, call.ctx, uuid.UUID(ai_user_id))
        return AIUserOut.model_validate(agent).model_dump(mode="json")


@mcp.tool
async def create_ai_user(
    name: str,
    provider: Literal["openai", "anthropic"],
    model: str,
    system_prompt: str,
    is_active: bool = True,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Define a new AI agent (name, provider, model, system prompt).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:write", org_id=org_id) as call:
        payload = AIUserCreateIn(
            name=name,
            provider=AIProviderType(provider),
            model=model,
            system_prompt=system_prompt,
            is_active=is_active,
        )
        agent = await ai_service.create_ai_user(call.session, call.ctx, payload)
        return AIUserOut.model_validate(agent).model_dump(mode="json")


@mcp.tool
async def update_ai_user(
    ai_user_id: str,
    name: str | None = None,
    model: str | None = None,
    system_prompt: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Edit an AI agent's name, model, or system prompt.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:write", org_id=org_id) as call:
        payload = AIUserUpdateIn(name=name, model=model, system_prompt=system_prompt)
        agent = await ai_service.update_ai_user(
            call.session, call.ctx, uuid.UUID(ai_user_id), payload
        )
        return AIUserOut.model_validate(agent).model_dump(mode="json")


@mcp.tool
async def pause_ai_user(
    ai_user_id: str, active: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Pause (active=false) or resume (active=true) an AI agent.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:write", org_id=org_id) as call:
        payload = AIUserUpdateIn(is_active=active)
        agent = await ai_service.update_ai_user(
            call.session, call.ctx, uuid.UUID(ai_user_id), payload
        )
        return AIUserOut.model_validate(agent).model_dump(mode="json")


@mcp.tool
async def set_ai_user_budget(
    ai_user_id: str, budget_monthly_cents: int, org_id: str | None = None
) -> dict[str, Any]:
    """Set an AI agent's monthly spend cap in cents (Paperclip-style budget).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:write", org_id=org_id) as call:
        payload = AIUserUpdateIn(budget_monthly_cents=budget_monthly_cents)
        agent = await ai_service.update_ai_user(
            call.session, call.ctx, uuid.UUID(ai_user_id), payload
        )
        return AIUserOut.model_validate(agent).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True))
async def delete_ai_user(
    ai_user_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete an AI agent. Preview unless confirm=true.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:write", org_id=org_id) as call:
        agent = await ai_service.get_ai_user(call.session, call.ctx, uuid.UUID(ai_user_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_ai_user",
                "name": agent.name,
                "hint": "Re-call delete_ai_user with confirm=true to delete.",
            }
        await ai_service.delete_ai_user(call.session, call.ctx, uuid.UUID(ai_user_id))
        return {"deleted": True, "ai_user_id": ai_user_id}


@mcp.tool
async def list_agent_runs(
    limit: int = 50, offset: int = 0, org_id: str | None = None
) -> dict[str, Any]:
    """List the org's AI runs (provider calls), newest first.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:read", org_id=org_id) as call:
        runs, total = await ai_service.list_runs(
            call.session, call.ctx, PageParams(limit=limit, offset=offset)
        )
        return {
            "total": total,
            "items": [AIRunOut.model_validate(run).model_dump(mode="json") for run in runs],
        }


@mcp.tool
async def list_ai_keys(org_id: str | None = None) -> dict[str, Any]:
    """List the org's BYOK provider keys (masked, showing only the last 4 characters).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:read", org_id=org_id) as call:
        keys = await ai_service.list_keys(call.session, call.ctx)
        return {"items": [AIKeyOut.model_validate(key).model_dump(mode="json") for key in keys]}


@mcp.tool
async def create_ai_key(
    provider: Literal["openai", "anthropic"],
    name: str,
    api_key: str,
    is_default: bool = False,
    validate_key: bool = False,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Store a BYOK provider key; the secret is write-only and never returned.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:keys", org_id=org_id) as call:
        payload = AIKeyCreateIn(
            provider=AIProviderType(provider),
            name=name,
            api_key=api_key,
            is_default=is_default,
            validate_key=validate_key,
        )
        key = await ai_service.create_key(call.session, call.ctx, payload)
        return AIKeyOut.model_validate(key).model_dump(mode="json")


@mcp.tool
async def update_ai_key(
    key_id: str,
    name: str | None = None,
    is_default: bool | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update a provider key's metadata (name, default flag); the secret is immutable.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:keys", org_id=org_id) as call:
        payload = AIKeyUpdateIn(name=name, is_default=is_default)
        key = await ai_service.update_key(call.session, call.ctx, uuid.UUID(key_id), payload)
        return AIKeyOut.model_validate(key).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def revoke_ai_key(
    key_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a provider key. Call with confirm=false to preview, then confirm=true to delete.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("agents:keys", org_id=org_id) as call:
        key = await ai_service.get_key(call.session, call.ctx, uuid.UUID(key_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "revoke_ai_key",
                "key_id": key_id,
                "name": key.name,
                "provider": key.provider.value,
                "last4": key.last4,
                "hint": "Re-call revoke_ai_key with confirm=true to permanently delete.",
            }
        await ai_service.delete_key(call.session, call.ctx, uuid.UUID(key_id))
        return {"deleted": True, "key_id": key_id}
