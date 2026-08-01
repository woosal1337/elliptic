"""Org, member, invite, and org-creation tools.

Org-scoped tools accept an optional ``org_id`` so a multi-organization token can
target a specific org; ``create_org`` and ``list_my_orgs`` are user-level (no org)."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call, mcp_call_user
from elliptic.modules.orgs import service as orgs_service
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.orgs.schemas import (
    InviteCreateIn,
    InviteOut,
    MemberOut,
    OrgCreateIn,
    OrgOut,
    OrgUpdateIn,
)


@mcp.tool
async def create_org(name: str, description: str | None = None) -> dict[str, Any]:
    """Create a new organization; you become its owner.

    Available to a multi-organization token (scope org:create). After creating an
    org, target it from other tools by passing its id as org_id."""
    async with mcp_call_user("org:create") as call:
        org = await orgs_service.create_org(
            call.session, call.principal.user, OrgCreateIn(name=name, description=description)
        )
        return OrgOut.model_validate(org).model_dump(mode="json")


@mcp.tool
async def list_my_orgs() -> dict[str, Any]:
    """List every organization you belong to (id, name, role), for choosing an org_id."""
    async with mcp_call_user("org:read") as call:
        orgs = await orgs_service.list_user_orgs(call.session, call.principal.user)
        return {
            "total": len(orgs),
            "items": [OrgOut.model_validate(org).model_dump(mode="json") for org in orgs],
        }


@mcp.tool
async def get_org(org_id: str | None = None) -> dict[str, Any]:
    """Fetch the authenticated organization.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:read", org_id=org_id) as call:
        return OrgOut.model_validate(call.ctx.org).model_dump(mode="json")


@mcp.tool
async def update_org(
    name: str | None = None, description: str | None = None, org_id: str | None = None
) -> dict[str, Any]:
    """Update the organization's editable fields (name, description).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:manage", org_id=org_id) as call:
        payload = OrgUpdateIn(name=name, description=description)
        org = await orgs_service.update_org(call.session, call.ctx, payload)
        return OrgOut.model_validate(org).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_org(confirm: bool = False, org_id: str | None = None) -> dict[str, Any]:
    """Delete the authenticated organization and ALL of its data (owner only).
    Call with confirm=false to preview, then confirm=true to permanently delete.
    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:manage", org_id=org_id) as call:
        if call.ctx.role != OrgRole.OWNER:
            return {"deleted": False, "error": "Only an organization owner can delete it."}
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_org",
                "org_id": str(call.ctx.org.id),
                "name": call.ctx.org.name,
                "hint": "Re-call delete_org with confirm=true to permanently delete this "
                "organization and everything in it.",
            }
        await orgs_service.delete_org(call.session, call.ctx)
        return {"deleted": True, "org_id": str(call.ctx.org.id)}


@mcp.tool
async def list_org_members(org_id: str | None = None) -> dict[str, Any]:
    """List the organization's members with their identity and role.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:read", org_id=org_id) as call:
        rows = await orgs_service.list_members(call.session, call.ctx)
        items = [
            MemberOut(
                id=member.id,
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=member.role,
                created_at=member.created_at,
            ).model_dump(mode="json")
            for member, user in rows
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def update_member_role(user_id: str, role: str, org_id: str | None = None) -> dict[str, Any]:
    """Change an org member's role (owner/admin/member; owner changes are owner-only).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:manage", org_id=org_id) as call:
        member = await orgs_service.update_member_role(
            call.session, call.ctx, uuid.UUID(user_id), OrgRole(role)
        )
        return {"user_id": user_id, "role": member.role.value}


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def remove_org_member(
    user_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Remove a member from the org. Call with confirm=false to preview, then confirm=true.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:manage", org_id=org_id) as call:
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "remove_org_member",
                "user_id": user_id,
                "hint": "Re-call remove_org_member with confirm=true to remove this member.",
            }
        await orgs_service.remove_member(call.session, call.ctx, uuid.UUID(user_id))
        return {"removed": True, "user_id": user_id}


@mcp.tool
async def list_invites(org_id: str | None = None) -> dict[str, Any]:
    """List the organization's invitations.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:read", org_id=org_id) as call:
        invites = await orgs_service.list_invites(call.session, call.ctx)
        items = [InviteOut.model_validate(invite).model_dump(mode="json") for invite in invites]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_invite(
    email: str, role: str | None = None, org_id: str | None = None
) -> dict[str, Any]:
    """Invite a user by email to the org (role defaults to member; returns the one-time token).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:manage", org_id=org_id) as call:
        payload = (
            InviteCreateIn(email=email, role=OrgRole(role)) if role else InviteCreateIn(email=email)
        )
        invite, token = await orgs_service.create_invite(call.session, call.ctx, payload)
        out = InviteOut.model_validate(invite)
        out.token = token
        return out.model_dump(mode="json")


@mcp.tool
async def revoke_invite(invite_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Revoke a pending invitation.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("org:manage", org_id=org_id) as call:
        await orgs_service.revoke_invite(call.session, call.ctx, uuid.UUID(invite_id))
        return {"revoked": True, "invite_id": invite_id}
