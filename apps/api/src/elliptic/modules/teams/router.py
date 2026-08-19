"""Team endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.projects.schemas import ProjectOut
from elliptic.modules.teams import service
from elliptic.modules.teams.schemas import (
    TeamCreateIn,
    TeamMemberIn,
    TeamMemberOut,
    TeamOut,
    TeamProjectLinkIn,
    TeamStatsOut,
    TeamUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/teams", tags=["teams"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_team(
    payload: TeamCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[TeamOut]:
    team = await service.create_team(session, ctx, payload)
    return ok(TeamOut.model_validate(team), message="Team created")


@router.get("")
async def list_teams(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[TeamOut]]:
    teams = await service.list_teams(session, ctx)
    return ok([TeamOut.model_validate(team) for team in teams])


@router.get("/{team_id}/stats")
async def team_stats(
    team_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TeamStatsOut]:
    stats = await service.team_stats(session, ctx, team_id)
    return ok(TeamStatsOut.model_validate(stats))


@router.get("/{team_id}")
async def get_team(
    team_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TeamOut]:
    team = await service.get_team(session, ctx, team_id)
    return ok(TeamOut.model_validate(team))


@router.patch("/{team_id}")
async def update_team(
    team_id: uuid.UUID, payload: TeamUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TeamOut]:
    team = await service.update_team(session, ctx, team_id, payload)
    return ok(TeamOut.model_validate(team), message="Team updated")


@router.delete("/{team_id}")
async def delete_team(
    team_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_team(session, ctx, team_id)
    return ok(None, message="Team deleted")


@router.get("/{team_id}/projects")
async def list_team_projects(
    team_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ProjectOut]]:
    projects = await service.list_team_projects(session, ctx, team_id)
    return ok([ProjectOut.model_validate(project) for project in projects])


@router.put("/{team_id}/projects")
async def link_team_projects(
    team_id: uuid.UUID, payload: TeamProjectLinkIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TeamOut]:
    team = await service.link_projects(session, ctx, team_id, payload.project_ids)
    return ok(TeamOut.model_validate(team), message="Projects linked")


@router.delete("/{team_id}/projects")
async def unlink_team_projects(
    team_id: uuid.UUID, payload: TeamProjectLinkIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TeamOut]:
    team = await service.unlink_projects(session, ctx, team_id, payload.project_ids)
    return ok(TeamOut.model_validate(team), message="Projects unlinked")


@router.get("/{team_id}/members")
async def list_team_members(
    team_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TeamMemberOut]]:
    members = await service.list_team_members(session, ctx, team_id)
    return ok([TeamMemberOut.model_validate(member) for member in members])


@router.post("/{team_id}/members", status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: uuid.UUID, payload: TeamMemberIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[TeamMemberOut]:
    member = await service.add_team_member(session, ctx, team_id, payload.user_id)
    return ok(TeamMemberOut.model_validate(member), message="Team member added")


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: uuid.UUID, user_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.remove_team_member(session, ctx, team_id, user_id)
    return ok(None, message="Team member removed")
