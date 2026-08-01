"""MCP connector endpoints (COS-228)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.mcp_connectors import service
from elliptic.modules.mcp_connectors.catalog import CATALOG
from elliptic.modules.mcp_connectors.schemas import (
    ConnectorCreateIn,
    ConnectorEnabledIn,
    ConnectorOut,
    TestConnectionOut,
)
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/mcp-connectors", tags=["mcp-connectors"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("/catalog")
async def get_catalog(ctx: OrgCtx) -> SuccessResponse[list[dict[str, str]]]:  # noqa: ARG001
    return ok(CATALOG)


@router.get("")
async def list_connectors(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[ConnectorOut]]:
    rows = await service.list_connectors(session, ctx)
    return ok([ConnectorOut.model_validate(c) for c in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_connector(
    payload: ConnectorCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[ConnectorOut]:
    connector = await service.create_connector(
        session,
        ctx,
        catalog_key=payload.catalog_key,
        endpoint_url=payload.endpoint_url,
        credential=payload.credential,
        header_name=payload.header_name,
    )
    return ok(ConnectorOut.model_validate(connector), message="Connector added")


@router.patch("/{connector_id}")
async def set_enabled(
    connector_id: uuid.UUID, payload: ConnectorEnabledIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[ConnectorOut]:
    connector = await service.set_enabled(session, ctx, connector_id, payload.enabled)
    return ok(ConnectorOut.model_validate(connector))


@router.delete("/{connector_id}")
async def delete_connector(
    connector_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_connector(session, ctx, connector_id)
    return ok(None, message="Connector removed")


@router.post("/{connector_id}/test")
async def test_connection(
    connector_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[TestConnectionOut]:
    """Connect to the remote server and list its tools (COS-228)."""
    result = await service.test_connection(session, ctx, connector_id)
    return ok(TestConnectionOut.model_validate(result))
