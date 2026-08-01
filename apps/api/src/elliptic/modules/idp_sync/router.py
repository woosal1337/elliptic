"""IdP group sync endpoints (COS-181)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.idp_sync import service
from elliptic.modules.idp_sync.schemas import (
    MappingIn,
    MappingOut,
    SyncDiffOut,
    SyncPreviewIn,
)
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/idp-sync", tags=["idp-sync"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("/mappings")
async def list_mappings(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[MappingOut]]:
    rows = await service.list_mappings(session, ctx)
    return ok([MappingOut.model_validate(m) for m in rows])


@router.post("/mappings", status_code=status.HTTP_201_CREATED)
async def create_mapping(
    payload: MappingIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[MappingOut]:
    mapping = await service.create_mapping(
        session, ctx, idp_group=payload.idp_group, project_id=payload.project_id, role=payload.role
    )
    return ok(MappingOut.model_validate(mapping), message="Mapping created")


@router.delete("/mappings/{mapping_id}")
async def delete_mapping(
    mapping_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_mapping(session, ctx, mapping_id)
    return ok(None, message="Mapping deleted")


@router.post("/preview")
async def sync_preview(
    payload: SyncPreviewIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[SyncDiffOut]:
    """Dry-run a reconcile for a user + group set, returning the diff (COS-181)."""
    diff = await service.reconcile(
        session, ctx.org.id, payload.user_id, payload.groups, auto_remove=True, dry_run=True
    )
    return ok(SyncDiffOut.model_validate(diff))
