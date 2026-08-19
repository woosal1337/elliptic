"""Project endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.projects import service
from elliptic.modules.projects.schemas import (
    ProjectArtifactIn,
    ProjectArtifactOut,
    ProjectBrowseOut,
    ProjectCreateIn,
    ProjectMemberIn,
    ProjectMemberOut,
    ProjectMemberRoleIn,
    ProjectOut,
    ProjectUpdateIn,
    SubscriptionStateOut,
)

router = APIRouter(prefix="/orgs/{org_id}/projects", tags=["projects"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]
MemberCtx = Annotated[OrgContext, Depends(require_role(OrgRole.MEMBER))]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreateIn, ctx: MemberCtx, session: SessionDep
) -> SuccessResponse[ProjectOut]:
    project = await service.create_project(session, ctx, payload)
    return ok(ProjectOut.model_validate(project), message="Project created")


@router.get("")
async def list_projects(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[ProjectOut]]:
    projects = await service.list_projects(session, ctx)
    return ok([ProjectOut.model_validate(project) for project in projects])


@router.get("/browse")
async def browse_projects(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ProjectBrowseOut]]:
    rows = await service.browse_projects(session, ctx)
    return ok(
        [
            ProjectBrowseOut.model_validate(project).model_copy(
                update={"member_count": count, "is_member": is_member}
            )
            for project, count, is_member in rows
        ]
    )


@router.post("/{project_id}/join", status_code=status.HTTP_201_CREATED)
async def join_project(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ProjectMemberOut]:
    member = await service.join_project(session, ctx, project_id)
    return ok(ProjectMemberOut.model_validate(member), message="Joined project")


@router.get("/deleted")
async def list_deleted_projects(
    ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[list[ProjectOut]]:
    projects = await service.list_deleted_projects(session, ctx)
    return ok([ProjectOut.model_validate(project) for project in projects])


@router.get("/{project_id}")
async def get_project(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ProjectOut]:
    project = await service.get_project(session, ctx, project_id)
    return ok(ProjectOut.model_validate(project))


@router.patch("/{project_id}")
async def update_project(
    project_id: uuid.UUID, payload: ProjectUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ProjectOut]:
    project = await service.update_project(session, ctx, project_id, payload)
    return ok(ProjectOut.model_validate(project), message="Project updated")


@router.delete("/{project_id}")
async def delete_project(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_project(session, ctx, project_id)
    return ok(None, message="Project deleted")


@router.post("/{project_id}/restore")
async def restore_project(
    project_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[ProjectOut]:
    project = await service.restore_project(session, ctx, project_id)
    return ok(ProjectOut.model_validate(project), message="Project restored")


@router.get("/{project_id}/subscription")
async def get_project_subscription(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SubscriptionStateOut]:
    subscribed = await service.is_project_subscribed(session, ctx, project_id)
    return ok(SubscriptionStateOut(subscribed=subscribed))


@router.post("/{project_id}/subscribe")
async def subscribe_project(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SubscriptionStateOut]:
    await service.set_project_subscription(session, ctx, project_id, subscribed=True)
    return ok(SubscriptionStateOut(subscribed=True), message="Subscribed")


@router.post("/{project_id}/unsubscribe")
async def unsubscribe_project(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SubscriptionStateOut]:
    await service.set_project_subscription(session, ctx, project_id, subscribed=False)
    return ok(SubscriptionStateOut(subscribed=False), message="Unsubscribed")


@router.get("/{project_id}/artifacts")
async def list_artifacts(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ProjectArtifactOut]]:
    artifacts = await service.list_artifacts(session, ctx, project_id)
    return ok([ProjectArtifactOut.model_validate(artifact) for artifact in artifacts])


@router.post("/{project_id}/artifacts", status_code=status.HTTP_201_CREATED)
async def add_artifact(
    project_id: uuid.UUID, payload: ProjectArtifactIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ProjectArtifactOut]:
    artifact = await service.add_artifact(session, ctx, project_id, payload)
    return ok(ProjectArtifactOut.model_validate(artifact), message="Artifact added")


@router.delete("/{project_id}/artifacts/{artifact_id}")
async def delete_artifact(
    project_id: uuid.UUID, artifact_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_artifact(session, ctx, project_id, artifact_id)
    return ok(None, message="Artifact removed")


@router.get("/{project_id}/members")
async def list_project_members(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ProjectMemberOut]]:
    members = await service.list_project_members(session, ctx, project_id)
    return ok([ProjectMemberOut.model_validate(member) for member in members])


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: uuid.UUID, payload: ProjectMemberIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[ProjectMemberOut]:
    member = await service.add_project_member(
        session, ctx, project_id, payload.user_id, payload.role
    )
    return ok(ProjectMemberOut.model_validate(member), message="Project member added")


@router.patch("/{project_id}/members/{user_id}")
async def set_project_member_role(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: ProjectMemberRoleIn,
    ctx: AdminCtx,
    session: SessionDep,
) -> SuccessResponse[ProjectMemberOut]:
    member = await service.set_project_member_role(session, ctx, project_id, user_id, payload.role)
    return ok(ProjectMemberOut.model_validate(member), message="Role updated")


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: uuid.UUID, user_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.remove_project_member(session, ctx, project_id, user_id)
    return ok(None, message="Project member removed")
