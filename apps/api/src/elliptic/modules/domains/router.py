"""Domain-verification endpoints (COS-193)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.domains import service
from elliptic.modules.domains.schemas import DomainCreateIn, DomainOut
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/domains", tags=["domains"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("")
async def list_domains(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[DomainOut]]:
    rows = await service.list_domains(session, ctx)
    return ok([DomainOut.from_record(r) for r in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_domain(
    payload: DomainCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[DomainOut]:
    record = await service.create_domain(session, ctx, payload.domain)
    return ok(DomainOut.from_record(record), message="Add the TXT record, then verify")


@router.post("/{domain_id}/verify")
async def verify_domain(
    domain_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[DomainOut]:
    record = await service.verify_domain(session, ctx, domain_id)
    return ok(DomainOut.from_record(record), message="Domain verified")


@router.delete("/{domain_id}")
async def delete_domain(
    domain_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_domain(session, ctx, domain_id)
    return ok(None, message="Domain removed")
