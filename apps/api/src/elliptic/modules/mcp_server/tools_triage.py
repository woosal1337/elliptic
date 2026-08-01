"""Triage queue tools: review and route inbound tasks."""

import uuid
from typing import Any

from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.tasks import service as tasks_service


@mcp.tool
async def list_triage() -> dict[str, Any]:
    """List inbound triage tasks awaiting routing."""
    async with mcp_call("tasks:read") as call:
        tasks_with_keys = await tasks_service.list_triage_tasks(call.session, call.ctx)
        items = await tasks_service.serialize_mixed_tasks(call.session, tasks_with_keys)
        return {"items": [item.model_dump(mode="json") for item in items]}


@mcp.tool
async def accept_triage_task(task_id: str) -> dict[str, Any]:
    """Accept a triage task, routing it into its project."""
    async with mcp_call("tasks:write") as call:
        task, project = await tasks_service.accept_triage_task(
            call.session, call.ctx, uuid.UUID(task_id)
        )
        serialized = await tasks_service.serialize_task(call.session, task, project.key)
        return serialized.model_dump(mode="json")


@mcp.tool
async def decline_triage_task(task_id: str, reason: str | None = None) -> dict[str, Any]:
    """Decline a triage task with an optional reason."""
    async with mcp_call("tasks:write") as call:
        task, project = await tasks_service.decline_triage_task(
            call.session, call.ctx, uuid.UUID(task_id), reason=reason
        )
        serialized = await tasks_service.serialize_task(call.session, task, project.key)
        return serialized.model_dump(mode="json")
