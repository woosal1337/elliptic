"""Config-as-code endpoints (COS-243)."""

from typing import Any

from fastapi import APIRouter

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.config import service

router = APIRouter(prefix="/orgs/{org_id}/config", tags=["config"])


@router.get("/export")
async def export_config(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[dict[str, Any]]:
    """Export the org's declarative config as a canonical document (COS-243)."""
    return ok(await service.export_config(session, ctx))


@router.post("/validate")
async def validate_config(
    document: dict[str, Any],
    ctx: OrgCtx,  # noqa: ARG001  (auth/scoping dependency)
    session: SessionDep,  # noqa: ARG001  (auth/scoping dependency)
) -> SuccessResponse[dict[str, object]]:
    """Validate a config document against the schema (COS-243)."""
    errors = service.validate_config(document)
    return ok({"valid": not errors, "errors": errors})
