"""Team business logic."""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
)
from elliptic.core.models_base import utcnow
from elliptic.modules.activity.service import record_activity
from elliptic.modules.orgs.models import OrganizationMember, OrgRole
from elliptic.modules.projects import service as projects_service
from elliptic.modules.projects.models import (
    PROJECT_ROLE_RANK,
    Project,
    ProjectMember,
    ProjectRole,
)
from elliptic.modules.rbac_audit.models import RbacAction, RbacResourceScope
from elliptic.modules.rbac_audit.service import record_rbac_audit
from elliptic.modules.tasks.models import PROGRESS_EXCLUDED_STATUSES, Task, TaskStatus
from elliptic.modules.teams.models import Team, TeamMember, TeamProjectLink
from elliptic.modules.teams.schemas import TeamCreateIn, TeamUpdateIn


async def get_team(session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID) -> Team:
    """Fetch a team within the org or 404."""
    team = await session.scalar(select(Team).where(Team.id == team_id, Team.org_id == ctx.org.id))
    if team is None:
        raise NotFoundError("Team not found")
    return team


async def _require_org_member(session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID) -> None:
    member = await session.scalar(
        select(OrganizationMember.id).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise BadRequestError("User is not a member of this organization")


async def _ensure_team_member(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    existing = await session.scalar(
        select(TeamMember.id).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    if existing is None:
        session.add(TeamMember(org_id=ctx.org.id, team_id=team_id, user_id=user_id))


async def require_team_lead(session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID) -> Team:
    """The teamspace lead OR an org owner/admin may manage the teamspace."""
    team = await get_team(session, ctx, team_id)
    org_role = await session.scalar(
        select(OrganizationMember.role).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == ctx.user.id
        )
    )
    if org_role in (OrgRole.OWNER, OrgRole.ADMIN):
        return team
    if team.lead_id == ctx.user.id:
        return team
    raise ForbiddenError("Only the teamspace lead or an org admin can do this")


async def _grant_team_member_access(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Max-of-roles grant: ensure a team member sits at >= MEMBER on a linked project.

    Reads the raw ProjectMember role (NOT effective_project_role, whose admin
    bypass would skip persisting a real grant). Never downgrades an existing
    higher role. Guests are skipped to honour the guest ceiling.
    """
    org_role = await session.scalar(
        select(OrganizationMember.role).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if org_role is OrgRole.GUEST:
        return
    current: ProjectRole | None = await session.scalar(
        select(ProjectMember.role).where(
            ProjectMember.org_id == ctx.org.id,
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if current is None:
        await projects_service.add_project_member(
            session, ctx, project_id, user_id, ProjectRole.MEMBER, notify_user=False
        )
    elif PROJECT_ROLE_RANK[current] < PROJECT_ROLE_RANK[ProjectRole.MEMBER]:
        await projects_service.set_project_member_role(
            session, ctx, project_id, user_id, ProjectRole.MEMBER
        )


async def create_team(session: AsyncSession, ctx: OrgContext, payload: TeamCreateIn) -> Team:
    """Create a teamspace; the lead (if any) is auto-added as a member."""
    existing = await session.scalar(
        select(Team).where(Team.org_id == ctx.org.id, Team.name == payload.name)
    )
    if existing is not None:
        raise ConflictError("A team with this name already exists")
    if payload.lead_id is not None:
        await _require_org_member(session, ctx, payload.lead_id)
    team = Team(
        org_id=ctx.org.id,
        name=payload.name,
        description=payload.description,
        lead_id=payload.lead_id,
        charter=payload.charter,
        logo_props=payload.logo_props.model_dump(exclude_none=True) if payload.logo_props else {},
    )
    session.add(team)
    await session.flush()
    if team.lead_id is not None:
        await _ensure_team_member(session, ctx, team.id, team.lead_id)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="team",
        entity_id=team.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": team.name},
    )
    return team


async def list_teams(session: AsyncSession, ctx: OrgContext) -> list[Team]:
    """List teams in the organization."""
    result = await session.scalars(
        select(Team).where(Team.org_id == ctx.org.id).order_by(Team.created_at)
    )
    return list(result)


async def update_team(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID, payload: TeamUpdateIn
) -> Team:
    """Apply updates to a team."""
    team = await require_team_lead(session, ctx, team_id)
    if payload.name is not None and payload.name != team.name:
        clash = await session.scalar(
            select(Team).where(
                Team.org_id == ctx.org.id, Team.name == payload.name, Team.id != team.id
            )
        )
        if clash is not None:
            raise ConflictError("A team with this name already exists")
        team.name = payload.name
    if payload.description is not None:
        team.description = payload.description
    if payload.charter is not None:
        team.charter = payload.charter
    if payload.logo_props is not None:
        team.logo_props = payload.logo_props.model_dump(exclude_none=True)
    if payload.lead_id is not None and payload.lead_id != team.lead_id:
        await _require_org_member(session, ctx, payload.lead_id)
        team.lead_id = payload.lead_id
        await _ensure_team_member(session, ctx, team.id, payload.lead_id)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="team",
        entity_id=team.id,
        event_type="updated",
        actor_id=ctx.user.id,
    )
    await session.flush()
    return team


async def delete_team(session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID) -> None:
    """Delete a teamspace (lead or org admin only)."""
    team = await require_team_lead(session, ctx, team_id)
    await session.delete(team)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="team",
        entity_id=team_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": team.name},
    )
    await session.flush()


async def add_team_member(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID, user_id: uuid.UUID
) -> TeamMember:
    """Add an org member to a team."""
    team = await get_team(session, ctx, team_id)
    org_member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if org_member is None:
        raise BadRequestError("User is not a member of this organization")
    existing = await session.scalar(
        select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == user_id)
    )
    if existing is not None:
        raise ConflictError("User is already in this team")
    member = TeamMember(org_id=ctx.org.id, team_id=team.id, user_id=user_id)
    session.add(member)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="team",
        entity_id=team.id,
        event_type="member_added",
        actor_id=ctx.user.id,
        payload={"user_id": str(user_id)},
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.TEAM_MEMBER_ADDED,
        resource_scope=RbacResourceScope.TEAM,
        resource_id=team.id,
        subject_user_id=user_id,
    )
    linked = await session.scalars(
        select(TeamProjectLink.project_id).where(
            TeamProjectLink.team_id == team.id, TeamProjectLink.org_id == ctx.org.id
        )
    )
    for project_id in linked:
        await _grant_team_member_access(session, ctx, project_id, user_id)
    return member


async def remove_team_member(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Remove a member from a team."""
    team = await get_team(session, ctx, team_id)
    member = await session.scalar(
        select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == user_id)
    )
    if member is None:
        raise NotFoundError("Team member not found")
    await session.delete(member)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="team",
        entity_id=team.id,
        event_type="member_removed",
        actor_id=ctx.user.id,
        payload={"user_id": str(user_id)},
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.TEAM_MEMBER_REMOVED,
        resource_scope=RbacResourceScope.TEAM,
        resource_id=team.id,
        subject_user_id=user_id,
    )
    await session.flush()


async def list_team_members(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID
) -> list[TeamMember]:
    """List members of a team."""
    team = await get_team(session, ctx, team_id)
    result = await session.scalars(
        select(TeamMember).where(TeamMember.team_id == team.id).order_by(TeamMember.created_at)
    )
    return list(result)


async def team_stats(session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID) -> dict[str, int]:
    """Aggregate a team's portfolio: project count + task progress + overdue count."""
    await get_team(session, ctx, team_id)
    project_ids = list(
        await session.scalars(
            select(Project.id).where(
                Project.team_id == team_id,
                Project.org_id == ctx.org.id,
                Project.deleted_at.is_(None),
            )
        )
    )
    if not project_ids:
        return {"project_count": 0, "task_total": 0, "task_done": 0, "overdue": 0}

    today = utcnow().date()
    row = (
        await session.execute(
            select(
                func.count().filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
                func.count().filter(Task.status == TaskStatus.DONE),
                func.count().filter(
                    Task.due_date < today,
                    Task.status.notin_((TaskStatus.DONE, *PROGRESS_EXCLUDED_STATUSES)),
                ),
            ).where(Task.project_id.in_(project_ids))
        )
    ).one()
    return {
        "project_count": len(project_ids),
        "task_total": row[0],
        "task_done": row[1],
        "overdue": row[2],
    }


async def link_projects(
    session: AsyncSession,
    ctx: OrgContext,
    team_id: uuid.UUID,
    project_ids: list[uuid.UUID],
) -> Team:
    """Link projects to a teamspace, granting every member access (max-of-roles)."""
    team = await require_team_lead(session, ctx, team_id)
    member_ids = list(
        await session.scalars(
            select(TeamMember.user_id).where(
                TeamMember.team_id == team.id, TeamMember.org_id == ctx.org.id
            )
        )
    )
    newly_linked: list[uuid.UUID] = []
    for project_id in project_ids:
        project = await session.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.org_id == ctx.org.id,
                Project.deleted_at.is_(None),
            )
        )
        if project is None:
            raise BadRequestError("Project not found in this organization")
        existing = await session.scalar(
            select(TeamProjectLink.id).where(
                TeamProjectLink.team_id == team.id, TeamProjectLink.project_id == project_id
            )
        )
        if existing is not None:
            continue
        session.add(
            TeamProjectLink(
                org_id=ctx.org.id,
                team_id=team.id,
                project_id=project_id,
                role=ProjectRole.MEMBER,
            )
        )
        newly_linked.append(project_id)
        for user_id in member_ids:
            await _grant_team_member_access(session, ctx, project_id, user_id)
    await session.flush()
    if newly_linked:
        await record_activity(
            session,
            org_id=ctx.org.id,
            entity_type="team",
            entity_id=team.id,
            event_type="projects_linked",
            actor_id=ctx.user.id,
            payload={"project_ids": [str(pid) for pid in newly_linked]},
        )
    return team


async def unlink_projects(
    session: AsyncSession,
    ctx: OrgContext,
    team_id: uuid.UUID,
    project_ids: list[uuid.UUID],
) -> Team:
    """Unlink projects from a teamspace.

    Membership grants are sticky/additive: unlinking removes the link only and
    does NOT revoke ProjectMember rows (a manual or sole-admin grant is kept).
    """
    team = await require_team_lead(session, ctx, team_id)
    await session.execute(
        delete(TeamProjectLink).where(
            TeamProjectLink.team_id == team.id,
            TeamProjectLink.org_id == ctx.org.id,
            TeamProjectLink.project_id.in_(project_ids),
        )
    )
    await session.flush()
    return team


async def list_team_projects(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID
) -> list[Project]:
    """List the live projects linked to a teamspace."""
    await get_team(session, ctx, team_id)
    result = await session.scalars(
        select(Project)
        .join(TeamProjectLink, TeamProjectLink.project_id == Project.id)
        .where(
            TeamProjectLink.team_id == team_id,
            TeamProjectLink.org_id == ctx.org.id,
            Project.deleted_at.is_(None),
        )
        .order_by(Project.created_at)
    )
    return list(result)
