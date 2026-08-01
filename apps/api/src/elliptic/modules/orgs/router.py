"""Organization, member, and invitation endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import CurrentUser, OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs import service
from elliptic.modules.orgs.models import InviteStatus, OrgRole
from elliptic.modules.orgs.schemas import (
    EditionOut,
    InviteAcceptIn,
    InviteCreateIn,
    InviteOut,
    InvitePreviewOut,
    MemberOut,
    MemberRoleUpdateIn,
    OnboardingOut,
    OrgCreateIn,
    OrgOut,
    OrgUpdateIn,
    SeatUsageOut,
    SetPlanIn,
)

router = APIRouter(tags=["orgs"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]
OwnerCtx = Annotated[OrgContext, Depends(require_role(OrgRole.OWNER))]


@router.post("/orgs", status_code=status.HTTP_201_CREATED)
async def create_org(
    payload: OrgCreateIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[OrgOut]:
    org = await service.create_org(session, user, payload)
    return ok(OrgOut.model_validate(org), message="Organization created")


@router.get("/orgs")
async def list_my_orgs(user: CurrentUser, session: SessionDep) -> SuccessResponse[list[OrgOut]]:
    orgs = await service.list_user_orgs(session, user)
    return ok([OrgOut.model_validate(org) for org in orgs])


@router.get("/orgs/{org_id}")
async def get_org(ctx: OrgCtx) -> SuccessResponse[OrgOut]:
    return ok(OrgOut.model_validate(ctx.org))


@router.patch("/orgs/{org_id}")
async def update_org(
    payload: OrgUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[OrgOut]:
    org = await service.update_org(session, ctx, payload)
    return ok(OrgOut.model_validate(org), message="Organization updated")


@router.delete("/orgs/{org_id}")
async def delete_org(ctx: OwnerCtx, session: SessionDep) -> SuccessResponse[None]:
    await service.delete_org(session, ctx)
    return ok(None, message="Organization deleted")


@router.get("/orgs/{org_id}/members")
async def list_members(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[MemberOut]]:
    rows = await service.list_members(session, ctx)
    members = [
        MemberOut(
            id=member.id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=member.role,
            created_at=member.created_at,
        )
        for member, user in rows
    ]
    return ok(members)


@router.get("/orgs/{org_id}/billing/seats")
async def seat_usage(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[SeatUsageOut]:
    data = await service.seat_usage(session, ctx)
    return ok(SeatUsageOut.model_validate(data))


@router.patch("/orgs/{org_id}/members/{user_id}")
async def update_member_role(
    user_id: uuid.UUID, payload: MemberRoleUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.update_member_role(session, ctx, user_id, payload.role)
    return ok(None, message="Member role updated")


@router.delete("/orgs/{org_id}/members/{user_id}")
async def remove_member(
    user_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.remove_member(session, ctx, user_id)
    return ok(None, message="Member removed")


@router.post("/orgs/{org_id}/invites", status_code=status.HTTP_201_CREATED)
async def create_invite(
    payload: InviteCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[InviteOut]:
    invite, token = await service.create_invite(session, ctx, payload)
    out = InviteOut.model_validate(invite)
    out.token = token
    return ok(out, message="Invitation created")


@router.get("/orgs/{org_id}/invites")
async def list_invites(ctx: AdminCtx, session: SessionDep) -> SuccessResponse[list[InviteOut]]:
    invites = await service.list_invites(session, ctx)
    return ok([InviteOut.model_validate(invite) for invite in invites])


@router.delete("/orgs/{org_id}/invites/{invite_id}")
async def revoke_invite(
    invite_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.revoke_invite(session, ctx, invite_id)
    return ok(None, message="Invitation revoked")


@router.get("/invites/{token}")
async def get_invite_preview(token: str, session: SessionDep) -> SuccessResponse[InvitePreviewOut]:
    """Public preview of an invite by token, so the UI can validate before
    presenting the accept flow. Returns 404 for an unknown token."""
    invite, org, effective = await service.preview_invite(session, token)
    return ok(
        InvitePreviewOut(
            org_id=org.id,
            org_name=org.name,
            email=invite.email,
            role=invite.role,
            status=effective,
            expires_at=invite.expires_at,
            acceptable=effective == InviteStatus.PENDING,
        )
    )


@router.post("/invites/accept")
async def accept_invite(
    payload: InviteAcceptIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[OrgOut]:
    org = await service.accept_invite(session, user, payload.token)
    return ok(OrgOut.model_validate(org), message="Invitation accepted")


@router.get("/orgs/{org_id}/onboarding")
async def get_onboarding(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[OnboardingOut]:
    """Get-started checklist computed from the workspace's real data (COS-136)."""
    data = await service.onboarding_checklist(session, ctx)
    return ok(OnboardingOut.model_validate(data))


@router.get("/orgs/{org_id}/billing/edition")
async def get_edition(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[EditionOut]:
    """The org's edition: plan, seat licensing, and feature gates (COS-197)."""
    data = await service.edition(session, ctx)
    return ok(EditionOut.model_validate(data))


@router.put("/orgs/{org_id}/billing/plan")
async def set_plan(
    payload: SetPlanIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[EditionOut]:
    """Change the org's edition (admin) — COS-197."""
    await service.set_plan(session, ctx, payload.plan)
    data = await service.edition(session, ctx)
    return ok(EditionOut.model_validate(data), message="Plan updated")
