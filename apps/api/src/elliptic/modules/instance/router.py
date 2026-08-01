"""Instance administration endpoints (COS-223)."""

import uuid

from fastapi import APIRouter

from elliptic.core.deps import InstanceAdmin, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.instance import service
from elliptic.modules.instance.schemas import (
    InstanceSettingsIn,
    InstanceSettingsOut,
    InstanceUserOut,
    LicenseActivateIn,
    LicenseIssueIn,
    LicenseOut,
)

router = APIRouter(prefix="/instance", tags=["instance"])


@router.get("/settings")
async def get_settings(
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[InstanceSettingsOut]:
    settings = await service.get_settings_row(session)
    return ok(InstanceSettingsOut.model_validate(settings))


@router.patch("/settings")
async def update_settings(
    payload: InstanceSettingsIn,
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[InstanceSettingsOut]:
    settings = await service.update_settings(session, **payload.model_dump(exclude_unset=True))
    return ok(InstanceSettingsOut.model_validate(settings), message="Instance settings updated")


@router.get("/users")
async def list_users(
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[list[InstanceUserOut]]:
    rows = await service.list_users(session)
    return ok([InstanceUserOut.model_validate(r) for r in rows])


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID, admin: InstanceAdmin, session: SessionDep
) -> SuccessResponse[None]:
    await service.set_suspended(session, admin, user_id, True)
    return ok(None, message="User suspended")


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: uuid.UUID, admin: InstanceAdmin, session: SessionDep
) -> SuccessResponse[None]:
    await service.set_suspended(session, admin, user_id, False)
    return ok(None, message="User reinstated")


@router.post("/users/{user_id}/grant-admin")
async def grant_admin(
    user_id: uuid.UUID, admin: InstanceAdmin, session: SessionDep
) -> SuccessResponse[None]:
    await service.set_instance_admin(session, admin, user_id, True)
    return ok(None, message="Instance admin granted")


@router.post("/users/{user_id}/revoke-admin")
async def revoke_admin(
    user_id: uuid.UUID, admin: InstanceAdmin, session: SessionDep
) -> SuccessResponse[None]:
    await service.set_instance_admin(session, admin, user_id, False)
    return ok(None, message="Instance admin revoked")


@router.post("/license/issue")
async def issue_license(
    payload: LicenseIssueIn,
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[dict[str, str]]:
    """Mint a signed offline license key (COS-230)."""
    token = await service.issue_license(
        session,
        plan=payload.plan,
        seats=payload.seats,
        licensee=payload.licensee,
        days=payload.days,
    )
    return ok({"token": token}, message="License issued")


@router.post("/license/activate")
async def activate_license(
    payload: LicenseActivateIn,
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[LicenseOut]:
    """Activate a license key (offline, signature-verified) — COS-230."""
    row = await service.activate_license(session, payload.token)
    return ok(
        LicenseOut(
            plan=row.plan,
            seats=row.seats,
            licensee=row.licensee,
            expires_at=row.expires_at.isoformat() if row.expires_at else None,
            active=row.active,
        ),
        message="License activated",
    )


@router.get("/license")
async def get_license(
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[LicenseOut | None]:
    row = await service.current_license(session)
    if row is None:
        return ok(None)
    return ok(
        LicenseOut(
            plan=row.plan,
            seats=row.seats,
            licensee=row.licensee,
            expires_at=row.expires_at.isoformat() if row.expires_at else None,
            active=row.active,
        )
    )


@router.delete("/license")
async def delink_license(
    admin: InstanceAdmin,  # noqa: ARG001  (auth dependency)
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.delink_license(session)
    return ok(None, message="License delinked")
