"""SCIM 2.0 endpoints + token management (COS-184)."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.scim import service

admin_router = APIRouter(prefix="/orgs/{org_id}/scim", tags=["scim"])
scim_router = APIRouter(prefix="/scim/v2/orgs/{org_id}", tags=["scim"])


async def scim_org(
    org_id: uuid.UUID,
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
) -> uuid.UUID:
    """Authenticate a SCIM request by its per-org bearer token (COS-184)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing SCIM bearer token")
    token = await service.resolve_token(session, authorization[7:].strip())
    if token is None or token.org_id != org_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid SCIM token")
    return org_id


ScimOrg = Annotated[uuid.UUID, Depends(scim_org)]


@admin_router.get("/token")
async def token_status(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[dict[str, object]]:
    token = await service.get_token(session, ctx.org.id)
    return ok(
        {
            "configured": token is not None,
            "prefix": token.prefix if token else None,
            "last_used_at": token.last_used_at.isoformat()
            if token and token.last_used_at
            else None,
            "base_url": f"/scim/v2/orgs/{ctx.org.id}",
        }
    )


@admin_router.post("/token")
async def mint_token(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[dict[str, str]]:
    """Generate (or rotate) the org's SCIM bearer token; the raw value is shown once."""
    _token, raw = await service.mint_token(session, ctx.org.id)
    return ok({"token": raw}, message="SCIM token generated — copy it now, it won't be shown again")


@admin_router.delete("/token")
async def revoke_token(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[None]:
    await service.revoke_token(session, ctx.org.id)
    return ok(None, message="SCIM token revoked")


def _list_response(resources: list[dict[str, object]]) -> dict[str, object]:
    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": len(resources),
        "Resources": resources,
        "startIndex": 1,
        "itemsPerPage": len(resources),
    }


@scim_router.get("/Users")
async def scim_list_users(org: ScimOrg, session: SessionDep) -> dict[str, object]:
    return _list_response(await service.list_users(session, org))


@scim_router.post("/Users", status_code=status.HTTP_201_CREATED)
async def scim_create_user(
    org: ScimOrg, session: SessionDep, payload: dict[str, Any]
) -> dict[str, object]:
    return await service.provision_user(session, org, payload)


@scim_router.get("/Users/{user_id}")
async def scim_get_user(org: ScimOrg, user_id: uuid.UUID, session: SessionDep) -> dict[str, object]:
    return await service.get_user(session, org, user_id)


@scim_router.put("/Users/{user_id}")
async def scim_put_user(
    org: ScimOrg, user_id: uuid.UUID, session: SessionDep, payload: dict[str, Any]
) -> dict[str, object]:
    active = payload.get("active", True)
    return await service.set_active(session, org, user_id, bool(active))


@scim_router.patch("/Users/{user_id}")
async def scim_patch_user(
    org: ScimOrg, user_id: uuid.UUID, session: SessionDep, payload: dict[str, Any]
) -> dict[str, object]:
    """Honor the common Azure/Okta 'replace active' PATCH op (COS-184)."""
    active = True
    operations = payload.get("Operations", [])
    if isinstance(operations, list):
        for op_item in operations:
            if isinstance(op_item, dict) and str(op_item.get("path", "")).lower() == "active":
                value = op_item.get("value")
                active = value if isinstance(value, bool) else str(value).lower() == "true"
    return await service.set_active(session, org, user_id, active)


@scim_router.delete("/Users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def scim_delete_user(org: ScimOrg, user_id: uuid.UUID, session: SessionDep) -> None:
    await service.set_active(session, org, user_id, False)
