"""Workflow status read/write tools."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.tasks.models import StatusCategory
from elliptic.modules.workflow import service as workflow_service
from elliptic.modules.workflow.schemas import (
    WorkflowStatusIn,
    WorkflowStatusOut,
    WorkflowStatusUpdateIn,
)


@mcp.tool
async def list_workflow_statuses(team_id: str | None = None) -> dict[str, Any]:
    """List workflow statuses for a scope: a team's override, or the org-level default."""
    async with mcp_call("workflow:read") as call:
        statuses = await workflow_service.list_statuses(
            call.session, call.ctx, uuid.UUID(team_id) if team_id else None
        )
        items = [
            WorkflowStatusOut.model_validate(item).model_dump(mode="json") for item in statuses
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_workflow_status(
    name: str,
    category: str,
    color: str = "muted-foreground",
    position: float | None = None,
    team_id: str | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Add a workflow status within a category and scope (requires admin)."""
    async with mcp_call("workflow:write") as call:

        async def _produce() -> dict[str, Any]:
            payload = WorkflowStatusIn(
                name=name,
                category=StatusCategory(category),
                color=color,
                position=position,
                team_id=uuid.UUID(team_id) if team_id else None,
            )
            created = await workflow_service.create_status(call.session, call.ctx, payload)
            return WorkflowStatusOut.model_validate(created).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_workflow_status",
            producer=_produce,
        )


@mcp.tool
async def update_workflow_status(
    status_id: str,
    name: str | None = None,
    color: str | None = None,
    position: float | None = None,
    is_default: bool | None = None,
) -> dict[str, Any]:
    """Rename, recolor, reorder, or set-default a workflow status (requires admin)."""
    async with mcp_call("workflow:write") as call:
        payload = WorkflowStatusUpdateIn(
            name=name, color=color, position=position, is_default=is_default
        )
        updated = await workflow_service.update_status(
            call.session, call.ctx, uuid.UUID(status_id), payload
        )
        return WorkflowStatusOut.model_validate(updated).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_workflow_status(status_id: str, confirm: bool = False) -> dict[str, Any]:
    """Remove a workflow status. Call with confirm=false to preview, then confirm=true to delete."""
    async with mcp_call("workflow:write") as call:
        target = next(
            (
                item
                for item in await workflow_service.list_statuses(call.session, call.ctx, None)
                if str(item.id) == status_id
            ),
            None,
        )
        if target is None:
            return {"deleted": False, "status_id": status_id, "error": "Workflow status not found"}
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_workflow_status",
                "status_id": status_id,
                "name": target.name,
                "hint": "Re-call delete_workflow_status with confirm=true to permanently delete.",
            }
        await workflow_service.delete_status(call.session, call.ctx, uuid.UUID(status_id))
        return {"deleted": True, "status_id": status_id}
