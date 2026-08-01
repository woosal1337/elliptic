"""Publish-board + public-board endpoints (COS-249)."""

import uuid

from fastapi import APIRouter

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.projects import public_board
from elliptic.modules.projects.schemas import (
    PublicBoardOut,
    PublishBoardIn,
    PublishBoardOut,
)

publish_router = APIRouter(prefix="/orgs/{org_id}/projects", tags=["projects"])
public_router = APIRouter(prefix="/public/boards", tags=["public-boards"])


@publish_router.post("/{project_id}/publish-board")
async def publish_board(
    project_id: uuid.UUID, payload: PublishBoardIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PublishBoardOut]:
    project = await public_board.publish(session, ctx, project_id, payload.attributes)
    token = project.public_token or ""
    return ok(
        PublishBoardOut(
            public_token=token,
            path=f"/public/boards/{token}",
            attributes=list(project.public_attributes or []),
        ),
        message="Board published",
    )


@publish_router.patch("/{project_id}/publish-board")
async def update_board_privacy(
    project_id: uuid.UUID, payload: PublishBoardIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PublishBoardOut]:
    project = await public_board.update_attributes(session, ctx, project_id, payload.attributes)
    token = project.public_token or ""
    return ok(
        PublishBoardOut(
            public_token=token,
            path=f"/public/boards/{token}",
            attributes=list(project.public_attributes or []),
        )
    )


@publish_router.delete("/{project_id}/publish-board")
async def unpublish_board(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await public_board.unpublish(session, ctx, project_id)
    return ok(None, message="Board unpublished")


@public_router.get("/{token}")
async def read_public_board(token: str, session: SessionDep) -> SuccessResponse[PublicBoardOut]:
    data = await public_board.read_public(session, token)
    return ok(PublicBoardOut.model_validate(data))
