"""Publish a view + read it via a login-less public link (COS-167)."""

import uuid

from fastapi import APIRouter

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.tasks.models import Task
from elliptic.modules.views import service
from elliptic.modules.views.schemas import PublicViewOut, PublicViewTask, PublishOut

publish_router = APIRouter(prefix="/orgs/{org_id}/views", tags=["views"])
public_router = APIRouter(prefix="/public/views", tags=["public-views"])


@publish_router.post("/{view_id}/publish")
async def publish_view(
    view_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PublishOut]:
    view = await service.publish_view(session, ctx, view_id)
    token = view.public_token or ""
    return ok(
        PublishOut(public_token=token, path=f"/public/views/{token}"), message="View published"
    )


@publish_router.delete("/{view_id}/publish")
async def unpublish_view(
    view_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unpublish_view(session, ctx, view_id)
    return ok(None, message="View unpublished")


def _priority(task: Task) -> str:
    value = getattr(task, "priority", None)
    if value is None:
        return "none"
    return value.value if hasattr(value, "value") else str(value)


@public_router.get("/{token}")
async def read_public_view(token: str, session: SessionDep) -> SuccessResponse[PublicViewOut]:
    view = await service.public_view(session, token)
    dataset = await service.public_view_dataset(session, view)
    tasks = [
        PublicViewTask(
            identifier=f"{key}-{task.number}",
            title=task.title,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
            priority=_priority(task),
        )
        for task, key in dataset
    ]
    return ok(PublicViewOut(name=view.name, tasks=tasks))
