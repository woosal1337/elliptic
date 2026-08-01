"""Custom meeting template and recipe tools (AI summary surface)."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.meeting_templates import service as meeting_templates_service
from elliptic.modules.meeting_templates.schemas import (
    MeetingRecipeIn,
    MeetingRecipeOut,
    MeetingTemplateIn,
    MeetingTemplateOut,
    MeetingTemplateUpdateIn,
)


@mcp.tool
async def list_meeting_templates(org_id: str | None = None) -> dict[str, Any]:
    """List the org's custom meeting summary templates.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        templates = await meeting_templates_service.list_templates(call.session, call.ctx)
        items = [
            MeetingTemplateOut.model_validate(template).model_dump(mode="json")
            for template in templates
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_meeting_template(
    name: str,
    sections: list[str] | None = None,
    prompt_scaffold: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a custom meeting summary template (org admin only; names must be unique).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = MeetingTemplateIn(
            name=name, sections=sections or [], prompt_scaffold=prompt_scaffold
        )
        template = await meeting_templates_service.create_template(call.session, call.ctx, payload)
        return MeetingTemplateOut.model_validate(template).model_dump(mode="json")


@mcp.tool
async def update_meeting_template(
    template_id: str,
    name: str | None = None,
    sections: list[str] | None = None,
    prompt_scaffold: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update a custom meeting template's name, sections, or prompt scaffold (org admin only).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = MeetingTemplateUpdateIn(
            name=name, sections=sections, prompt_scaffold=prompt_scaffold
        )
        template = await meeting_templates_service.update_template(
            call.session, call.ctx, uuid.UUID(template_id), payload
        )
        return MeetingTemplateOut.model_validate(template).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_meeting_template(
    template_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a custom meeting template (org admin only). Preview unless confirm=true.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        templates = await meeting_templates_service.list_templates(call.session, call.ctx)
        target = next((template for template in templates if str(template.id) == template_id), None)
        if target is None:
            return {"deleted": False, "template_id": template_id, "error": "Template not found"}
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_meeting_template",
                "template_id": template_id,
                "name": target.name,
                "hint": "Re-call delete_meeting_template with confirm=true to permanently delete.",
            }
        await meeting_templates_service.delete_template(
            call.session, call.ctx, uuid.UUID(template_id)
        )
        return {"deleted": True, "template_id": template_id}


@mcp.tool
async def list_meeting_recipes(org_id: str | None = None) -> dict[str, Any]:
    """List the org's saved meeting recipes (named transcript prompts).

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:read", org_id=org_id) as call:
        recipes = await meeting_templates_service.list_recipes(call.session, call.ctx)
        items = [
            MeetingRecipeOut.model_validate(recipe).model_dump(mode="json") for recipe in recipes
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_meeting_recipe(
    name: str, prompt: str, org_id: str | None = None
) -> dict[str, Any]:
    """Save a custom meeting recipe (a named transcript prompt); names must be unique.

    Pass org_id to target a specific organization when using a multi-organization token.
    """
    async with mcp_call("meetings:write", org_id=org_id) as call:
        payload = MeetingRecipeIn(name=name, prompt=prompt)
        recipe = await meeting_templates_service.create_recipe(call.session, call.ctx, payload)
        return MeetingRecipeOut.model_validate(recipe).model_dump(mode="json")
