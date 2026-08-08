"""Automation rule read/write tools at parity with the web automation surface."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.automation import service as automation_service
from elliptic.modules.automation.schemas import (
    AutomationActionIn,
    AutomationRuleIn,
    AutomationRuleOut,
    AutomationRuleUpdateIn,
)
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call


def _actions(values: list[dict[str, Any]]) -> list[AutomationActionIn]:
    return [AutomationActionIn.model_validate(value) for value in values]


@mcp.tool
async def list_automations(org_id: str | None = None) -> dict[str, Any]:
    """List the org's automation rules (triggers, actions, skills).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("automation:read", org_id=org_id) as call:
        rules = await automation_service.list_rules(call.session, call.ctx)
        items = [AutomationRuleOut.model_validate(rule).model_dump(mode="json") for rule in rules]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_automation(
    name: str,
    trigger: str,
    actions: list[dict[str, Any]] | None = None,
    is_skill: bool = False,
    enabled: bool = True,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create an automation rule; actions are {type, value} dicts (admin only).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("automation:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            # model_validate so the `trigger` string is coerced/validated against the
            # AutomationTrigger enum at runtime (StrEnum) instead of asserted statically.
            payload = AutomationRuleIn.model_validate(
                {
                    "name": name,
                    "trigger": trigger,
                    "actions": _actions(actions or []),
                    "is_skill": is_skill,
                    "enabled": enabled,
                }
            )
            rule = await automation_service.create_rule(call.session, call.ctx, payload)
            return AutomationRuleOut.model_validate(rule).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_automation",
            producer=_produce,
        )


@mcp.tool
async def update_automation(
    rule_id: str,
    name: str | None = None,
    trigger: str | None = None,
    actions: list[dict[str, Any]] | None = None,
    is_skill: bool | None = None,
    enabled: bool | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update an automation rule's name, trigger, actions, skill flag, or enabled state.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("automation:write", org_id=org_id) as call:
        # model_validate so the optional `trigger` string is validated against the
        # AutomationTrigger enum at runtime instead of asserted statically.
        payload = AutomationRuleUpdateIn.model_validate(
            {
                "name": name,
                "trigger": trigger,
                "actions": _actions(actions) if actions is not None else None,
                "is_skill": is_skill,
                "enabled": enabled,
            }
        )
        rule = await automation_service.update_rule(
            call.session, call.ctx, uuid.UUID(rule_id), payload
        )
        return AutomationRuleOut.model_validate(rule).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_automation(
    rule_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete an automation rule. Call with confirm=false to preview, then confirm=true.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("automation:write", org_id=org_id) as call:
        target = next(
            (
                rule
                for rule in await automation_service.list_rules(call.session, call.ctx)
                if str(rule.id) == rule_id
            ),
            None,
        )
        if target is None:
            return {"deleted": False, "rule_id": rule_id, "error": "Automation rule not found"}
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_automation",
                "rule_id": rule_id,
                "name": target.name,
                "hint": "Re-call delete_automation with confirm=true to permanently delete.",
            }
        await automation_service.delete_rule(call.session, call.ctx, uuid.UUID(rule_id))
        return {"deleted": True, "rule_id": rule_id}


@mcp.tool
async def run_automation(rule_id: str, task_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Run an enabled skill rule against a task on demand.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("automation:write", org_id=org_id) as call:
        ran = await automation_service.run_skill(
            call.session, call.ctx, uuid.UUID(rule_id), uuid.UUID(task_id)
        )
        return {"ok": ran, "rule_id": rule_id, "task_id": task_id}
