"""Git sync endpoints (COS-256)."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Header, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.integrations import git_service as service
from elliptic.modules.integrations.git_schemas import GitConnectionIn, GitConnectionOut

router = APIRouter(prefix="/orgs/{org_id}/projects/{project_id}/git", tags=["integrations"])
public_router = APIRouter(prefix="/integrations/git", tags=["public-integrations"])


@router.get("")
async def list_connections(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[GitConnectionOut]]:
    rows = await service.list_connections(session, ctx, project_id)
    return ok([GitConnectionOut.model_validate(r) for r in rows])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_connection(
    project_id: uuid.UUID, payload: GitConnectionIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[GitConnectionOut]:
    connection = await service.create_connection(
        session, ctx, project_id, owner=payload.owner, repo=payload.repo
    )
    return ok(GitConnectionOut.model_validate(connection), message="Repository connected")


@router.delete("/{connection_id}")
async def delete_connection(
    project_id: uuid.UUID,  # noqa: ARG001
    connection_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.delete_connection(session, ctx, connection_id)
    return ok(None, message="Repository disconnected")


@public_router.post("/{token}", status_code=status.HTTP_202_ACCEPTED)
async def receive(
    token: str,
    payload: dict[str, Any],
    session: SessionDep,
    x_github_event: Annotated[str, Header()] = "",
) -> SuccessResponse[dict[str, object]]:
    """Receive a GitHub webhook (issues / pull_request / push) — COS-256."""
    result = await service.ingest(session, token, x_github_event, payload)
    return ok(result, message="Event received")
