"""Custom-role endpoints (COS-176)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs import roles_service
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.orgs.schemas import (
    AssignRoleIn,
    CustomRoleIn,
    CustomRoleOut,
    CustomRoleUpdateIn,
    PermissionDef,
    PermissionsOut,
)

router = APIRouter(prefix="/orgs/{org_id}/roles", tags=["roles"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("/permissions")
async def my_permissions(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[PermissionsOut]:
    """The permission catalog + the caller's effective permissions (COS-176)."""
    granted = await roles_service.effective_permissions(session, ctx)
    catalog = [PermissionDef.model_validate(p) for p in roles_service.PERMISSION_CATALOG]
    return ok(
        PermissionsOut(
            catalog=catalog,
            granted=granted,
            matrix_schema=roles_service.PERMISSION_MATRIX_SCHEMA,
            matrix_cells=list(roles_service.PERMISSION_CELLS),
        )
    )


@router.get("")
async def list_roles(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[CustomRoleOut]]:
    rows = await roles_service.list_roles(session, ctx)
    return ok([CustomRoleOut.model_validate(r) for r in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: CustomRoleIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[CustomRoleOut]:
    role = await roles_service.create_role(
        session,
        ctx,
        name=payload.name,
        description=payload.description,
        permissions=payload.permissions,
        matrix=payload.matrix,
    )
    return ok(CustomRoleOut.model_validate(role), message="Role created")


@router.patch("/{role_id}")
async def update_role(
    role_id: uuid.UUID, payload: CustomRoleUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[CustomRoleOut]:
    role = await roles_service.update_role(
        session,
        ctx,
        role_id,
        name=payload.name,
        description=payload.description,
        permissions=payload.permissions,
        matrix=payload.matrix,
    )
    return ok(CustomRoleOut.model_validate(role))


@router.delete("/{role_id}")
async def delete_role(
    role_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await roles_service.delete_role(session, ctx, role_id)
    return ok(None, message="Role deleted")


@router.post("/assign")
async def assign_role(
    payload: AssignRoleIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await roles_service.assign_role(session, ctx, payload.user_id, payload.custom_role_id)
    return ok(None, message="Role assigned")
