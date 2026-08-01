"""Project read/write tools."""

import uuid
from datetime import date
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.projects import service as projects_service
from elliptic.modules.projects.models import ProjectStatus
from elliptic.modules.projects.schemas import (
    ProjectArtifactIn,
    ProjectArtifactOut,
    ProjectCreateIn,
    ProjectMemberOut,
    ProjectOut,
    ProjectUpdateIn,
    SubscriptionStateOut,
)


def _opt_uuid(value: str | None) -> uuid.UUID | None:
    return uuid.UUID(value) if value else None


def _opt_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


@mcp.tool
async def list_projects(org_id: str | None = None) -> dict[str, Any]:
    """List the organization's active projects.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        projects = await projects_service.list_projects(call.session, call.ctx)
        return {
            "items": [
                ProjectOut.model_validate(project).model_dump(mode="json") for project in projects
            ]
        }


@mcp.tool
async def get_project(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one project by id.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        project = await projects_service.get_project(call.session, call.ctx, uuid.UUID(project_id))
        return ProjectOut.model_validate(project).model_dump(mode="json")


@mcp.tool
async def create_project(
    name: str,
    key: str,
    description: str | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a project with a unique key (admin/owner only, enforced by the service).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = ProjectCreateIn(name=name, key=key, description=description)
            project = await projects_service.create_project(call.session, call.ctx, payload)
            return ProjectOut.model_validate(project).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_project",
            producer=_produce,
        )


@mcp.tool
async def update_project(
    project_id: str,
    name: str | None = None,
    description: str | None = None,
    status: str | None = None,
    team_id: str | None = None,
    lead_id: str | None = None,
    target_date: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update a project's fields (name, description, status, team, lead, target date).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        payload = ProjectUpdateIn(
            name=name,
            description=description,
            status=ProjectStatus(status) if status else None,
            team_id=_opt_uuid(team_id),
            lead_id=_opt_uuid(lead_id),
            target_date=_opt_date(target_date),
        )
        project = await projects_service.update_project(
            call.session, call.ctx, uuid.UUID(project_id), payload
        )
        return ProjectOut.model_validate(project).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_project(
    project_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Soft-delete a project. Call with confirm=false to preview, then confirm=true to delete.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        project = await projects_service.get_project(call.session, call.ctx, uuid.UUID(project_id))
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_project",
                "project_id": project_id,
                "name": project.name,
                "key": project.key,
                "hint": "Re-call delete_project with confirm=true to delete (recoverable 30 days).",
            }
        await projects_service.delete_project(call.session, call.ctx, uuid.UUID(project_id))
        return {"deleted": True, "project_id": project_id}


@mcp.tool
async def restore_project(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Restore a soft-deleted project within its 30-day recovery window.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        project = await projects_service.restore_project(
            call.session, call.ctx, uuid.UUID(project_id)
        )
        return ProjectOut.model_validate(project).model_dump(mode="json")


@mcp.tool
async def list_deleted_projects(org_id: str | None = None) -> dict[str, Any]:
    """List soft-deleted projects still inside the 30-day recovery window.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        projects = await projects_service.list_deleted_projects(call.session, call.ctx)
        items = [ProjectOut.model_validate(project).model_dump(mode="json") for project in projects]
        return {"total": len(items), "items": items}


@mcp.tool
async def get_project_subscription(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Whether the current user is subscribed to this project's notification stream.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        subscribed = await projects_service.is_project_subscribed(
            call.session, call.ctx, uuid.UUID(project_id)
        )
        return SubscriptionStateOut(subscribed=subscribed).model_dump(mode="json")


@mcp.tool
async def subscribe_project(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Opt the current user into this project's notification stream.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await projects_service.set_project_subscription(
            call.session, call.ctx, uuid.UUID(project_id), subscribed=True
        )
        return SubscriptionStateOut(subscribed=True).model_dump(mode="json")


@mcp.tool
async def unsubscribe_project(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Opt the current user out of this project's notification stream.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await projects_service.set_project_subscription(
            call.session, call.ctx, uuid.UUID(project_id), subscribed=False
        )
        return SubscriptionStateOut(subscribed=False).model_dump(mode="json")


@mcp.tool
async def list_project_members(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List the member assignments of a project.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        members = await projects_service.list_project_members(
            call.session, call.ctx, uuid.UUID(project_id)
        )
        items = [
            ProjectMemberOut.model_validate(member).model_dump(mode="json") for member in members
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def add_project_member(
    project_id: str, user_id: str, org_id: str | None = None
) -> dict[str, Any]:
    """Assign an org member to a project (admin/owner only, enforced by the service).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        member = await projects_service.add_project_member(
            call.session, call.ctx, uuid.UUID(project_id), uuid.UUID(user_id)
        )
        return ProjectMemberOut.model_validate(member).model_dump(mode="json")


@mcp.tool
async def remove_project_member(
    project_id: str, user_id: str, org_id: str | None = None
) -> dict[str, Any]:
    """Remove a member assignment from a project.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await projects_service.remove_project_member(
            call.session, call.ctx, uuid.UUID(project_id), uuid.UUID(user_id)
        )
        return {"removed": True, "project_id": project_id, "user_id": user_id}


@mcp.tool
async def list_project_artifacts(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List a project's linked artifacts.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        artifacts = await projects_service.list_artifacts(
            call.session, call.ctx, uuid.UUID(project_id)
        )
        items = [
            ProjectArtifactOut.model_validate(artifact).model_dump(mode="json")
            for artifact in artifacts
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def add_project_artifact(
    project_id: str, label: str, url: str, org_id: str | None = None
) -> dict[str, Any]:
    """Add a linked artifact (label + url) to a project.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        payload = ProjectArtifactIn(label=label, url=url)
        artifact = await projects_service.add_artifact(
            call.session, call.ctx, uuid.UUID(project_id), payload
        )
        return ProjectArtifactOut.model_validate(artifact).model_dump(mode="json")


@mcp.tool
async def remove_project_artifact(
    project_id: str, artifact_id: str, org_id: str | None = None
) -> dict[str, Any]:
    """Remove a linked artifact from a project.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await projects_service.delete_artifact(
            call.session, call.ctx, uuid.UUID(project_id), uuid.UUID(artifact_id)
        )
        return {"removed": True, "project_id": project_id, "artifact_id": artifact_id}
