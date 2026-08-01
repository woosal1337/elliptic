"""Project business logic, including the concurrency-safe task counter."""

import uuid
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
)
from elliptic.modules.activity.service import record_activity
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from elliptic.modules.orgs.models import OrganizationMember, OrgRole
from elliptic.modules.projects.models import (
    GUEST_ALLOWED_PROJECT_ROLES,
    PROJECT_ROLE_RANK,
    Project,
    ProjectArtifact,
    ProjectMember,
    ProjectNetwork,
    ProjectRole,
    ProjectState,
    ProjectStatus,
    ProjectSubscription,
    ProjectUpdate,
)
from elliptic.modules.projects.schemas import (
    ProjectArtifactIn,
    ProjectCreateIn,
    ProjectUpdateCreateIn,
    ProjectUpdateIn,
)
from elliptic.modules.rbac_audit.models import RbacAction, RbacResourceScope
from elliptic.modules.rbac_audit.service import record_rbac_audit
from elliptic.modules.teams.models import Team, TeamMember, TeamProjectLink

SOFT_DELETE_RETENTION_DAYS = 30


async def get_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    """Fetch a live (non-soft-deleted) project within the org or 404."""
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.org_id == ctx.org.id,
            Project.deleted_at.is_(None),
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def lock_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    """Fetch a project with FOR UPDATE, serializing task numbering per project."""
    project = await session.scalar(
        select(Project)
        .where(
            Project.id == project_id,
            Project.org_id == ctx.org.id,
            Project.deleted_at.is_(None),
        )
        .with_for_update()
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def next_task_number(session: AsyncSession, project: Project) -> int:
    """Allocate the next per-project task number under the row lock."""
    project.task_counter += 1
    await session.flush()
    return project.task_counter


async def _validate_team(session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID) -> None:
    team = await session.scalar(select(Team).where(Team.id == team_id, Team.org_id == ctx.org.id))
    if team is None:
        raise BadRequestError("Team not found in this organization")


async def create_project(
    session: AsyncSession, ctx: OrgContext, payload: ProjectCreateIn
) -> Project:
    """Create a project with a unique per-org key; creator becomes a member."""
    existing = await session.scalar(
        select(Project).where(Project.org_id == ctx.org.id, Project.key == payload.key)
    )
    if existing is not None:
        raise ConflictError("A project with this key already exists")
    if payload.team_id is not None:
        await _validate_team(session, ctx, payload.team_id)
    project = Project(
        org_id=ctx.org.id,
        team_id=payload.team_id,
        name=payload.name,
        key=payload.key,
        description=payload.description,
        lead_id=payload.lead_id,
        target_date=payload.target_date,
        network=payload.network or ProjectNetwork.PRIVATE,
    )
    session.add(project)
    await session.flush()
    session.add(
        ProjectMember(
            org_id=ctx.org.id,
            project_id=project.id,
            user_id=ctx.user.id,
            role=ProjectRole.ADMIN,
        )
    )
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": project.name, "key": project.key},
    )
    return project


async def list_projects(session: AsyncSession, ctx: OrgContext) -> list[Project]:
    """List live projects in the organization."""
    result = await session.scalars(
        select(Project)
        .where(Project.org_id == ctx.org.id, Project.deleted_at.is_(None))
        .order_by(Project.created_at)
    )
    return list(result)


async def list_deleted_projects(session: AsyncSession, ctx: OrgContext) -> list[Project]:
    """List soft-deleted projects still inside the recovery window."""
    cutoff = datetime.now(UTC) - timedelta(days=SOFT_DELETE_RETENTION_DAYS)
    result = await session.scalars(
        select(Project)
        .where(
            Project.org_id == ctx.org.id,
            Project.deleted_at.is_not(None),
            Project.deleted_at >= cutoff,
        )
        .order_by(Project.deleted_at.desc())
    )
    return list(result)


async def _validate_project_state(
    session: AsyncSession, ctx: OrgContext, state_id: uuid.UUID
) -> None:
    valid = await session.scalar(
        select(ProjectState.id).where(
            ProjectState.id == state_id, ProjectState.org_id == ctx.org.id
        )
    )
    if valid is None:
        raise BadRequestError("Unknown project state")


def _apply_lifecycle_settings(project: Project, payload: ProjectUpdateIn) -> None:
    """Apply the auto-archive / auto-close timers (with explicit clears)."""
    if payload.clear_auto_archive:
        project.auto_archive_days = None
    elif payload.auto_archive_days is not None:
        project.auto_archive_days = payload.auto_archive_days
    if payload.clear_auto_close:
        project.auto_close_days = None
        project.auto_close_status = None
        return
    if payload.auto_close_days is not None:
        project.auto_close_days = payload.auto_close_days
    if payload.auto_close_status is not None:
        project.auto_close_status = payload.auto_close_status.value


async def update_project(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: ProjectUpdateIn
) -> Project:
    """Apply updates to a project."""
    project = await get_project(session, ctx, project_id)
    for assignee_field in ("intake_owner_id", "default_assignee_id"):
        candidate = getattr(payload, assignee_field, None)
        if candidate is not None and await _is_org_guest(session, ctx, candidate):
            raise BadRequestError("Guests cannot be an intake owner or default assignee")
    if payload.team_id is not None:
        await _validate_team(session, ctx, payload.team_id)
        project.team_id = payload.team_id
    if payload.icon is not None:
        project.icon = payload.icon or None
    if payload.clear_intake_owner:
        project.intake_owner_id = None
    elif payload.intake_owner_id is not None:
        project.intake_owner_id = payload.intake_owner_id
    for field in (
        "name",
        "description",
        "status",
        "network",
        "lead_id",
        "default_assignee_id",
        "target_date",
        "features",
        "estimate_scale",
        "labels",
        "worklog_approval_required",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(project, field, value)
    if payload.clear_state:
        project.state_id = None
    elif payload.state_id is not None:
        await _validate_project_state(session, ctx, payload.state_id)
        project.state_id = payload.state_id
    _apply_lifecycle_settings(project, payload)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project.id,
        event_type="updated",
        actor_id=ctx.user.id,
        project_id=project.id,
    )
    await session.flush()
    return project


async def delete_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    """Soft-delete a project, keeping it recoverable for the retention window."""
    project = await get_project(session, ctx, project_id)
    project.deleted_at = datetime.now(UTC)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": project.name, "key": project.key},
    )
    await session.flush()


async def restore_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    """Restore a soft-deleted project within the retention window."""
    cutoff = datetime.now(UTC) - timedelta(days=SOFT_DELETE_RETENTION_DAYS)
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.org_id == ctx.org.id,
            Project.deleted_at.is_not(None),
        )
    )
    if project is None:
        raise NotFoundError("Deleted project not found")
    if project.deleted_at is not None and project.deleted_at < cutoff:
        raise BadRequestError("This project is past its 30-day recovery window")
    project.deleted_at = None
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project_id,
        event_type="restored",
        actor_id=ctx.user.id,
        payload={"name": project.name, "key": project.key},
    )
    await session.flush()
    return project


async def is_project_member(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """Check whether a user is assigned to a project."""
    member = await session.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.org_id == ctx.org.id,
        )
    )
    return member is not None


async def _is_org_guest(session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID) -> bool:
    """Whether a user is a workspace guest in this org."""
    org_role: OrgRole | None = await session.scalar(
        select(OrganizationMember.role).where(
            OrganizationMember.org_id == ctx.org.id,
            OrganizationMember.user_id == user_id,
        )
    )
    return org_role is OrgRole.GUEST


async def _assert_project_role_within_org_ceiling(
    session: AsyncSession,
    ctx: OrgContext,
    user_id: uuid.UUID,
    role: ProjectRole,
    *,
    org_role: OrgRole | None = None,
) -> None:
    """Enforce the workspace guest ceiling: a guest may only be viewer/commenter."""
    if org_role is None:
        org_role = await session.scalar(
            select(OrganizationMember.role).where(
                OrganizationMember.org_id == ctx.org.id,
                OrganizationMember.user_id == user_id,
            )
        )
    if org_role is OrgRole.GUEST and role not in GUEST_ALLOWED_PROJECT_ROLES:
        raise BadRequestError("Guests can only be viewers or commenters on a project")


async def add_project_member(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    role: ProjectRole = ProjectRole.MEMBER,
    *,
    notify_user: bool = True,
) -> ProjectMember:
    """Assign an org member to a project with a project role."""
    project = await get_project(session, ctx, project_id)
    org_member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if org_member is None:
        raise BadRequestError("User is not a member of this organization")
    await _assert_project_role_within_org_ceiling(
        session, ctx, user_id, role, org_role=org_member.role
    )
    if await is_project_member(session, ctx, project.id, user_id):
        raise ConflictError("User is already assigned to this project")
    member = ProjectMember(org_id=ctx.org.id, project_id=project.id, user_id=user_id, role=role)
    session.add(member)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project.id,
        event_type="member_added",
        actor_id=ctx.user.id,
        project_id=project.id,
        payload={"user_id": str(user_id)},
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.MEMBER_ADDED,
        resource_scope=RbacResourceScope.PROJECT,
        resource_id=project.id,
        project_id=project.id,
        subject_user_id=user_id,
        role_after=role.value,
    )
    if notify_user:
        try:
            await notify(
                session,
                org_id=ctx.org.id,
                recipient_id=user_id,
                type=NotificationType.MEMBER_ADDED,
                entity_type="project",
                entity_id=project.id,
                actor_id=ctx.user.id,
                title=f"You were added to {project.name}",
                snippet=None,
            )
        except Exception:
            logger.exception("Failed to emit member_added notification for project {}", project.id)
    return member


async def browse_projects(
    session: AsyncSession, ctx: OrgContext
) -> list[tuple[Project, int, bool]]:
    """List the org's public, active projects with member counts + caller membership."""
    rows = await session.execute(
        select(Project, func.count(ProjectMember.id))
        .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
        .where(
            Project.org_id == ctx.org.id,
            Project.network == ProjectNetwork.PUBLIC,
            Project.status == ProjectStatus.ACTIVE,
            Project.deleted_at.is_(None),
        )
        .group_by(Project.id)
        .order_by(Project.name)
    )
    projects = list(rows)
    mine = await session.scalars(
        select(ProjectMember.project_id).where(
            ProjectMember.org_id == ctx.org.id, ProjectMember.user_id == ctx.user.id
        )
    )
    my_ids = set(mine)
    return [(project, count, project.id in my_ids) for project, count in projects]


async def join_project(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> ProjectMember:
    """Self-join a public project as the current user."""
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None or project.deleted_at is not None:
        raise NotFoundError("Project not found")
    if project.network != ProjectNetwork.PUBLIC:
        raise ForbiddenError("This project is invite-only")
    if await is_project_member(session, ctx, project.id, ctx.user.id):
        raise ConflictError("You are already a member of this project")
    self_role = ProjectRole.COMMENTER if ctx.role is OrgRole.GUEST else ProjectRole.MEMBER
    member = ProjectMember(
        org_id=ctx.org.id, project_id=project.id, user_id=ctx.user.id, role=self_role
    )
    session.add(member)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project.id,
        event_type="member_added",
        actor_id=ctx.user.id,
        project_id=project.id,
        payload={"user_id": str(ctx.user.id), "self_join": True},
    )
    return member


async def remove_project_member(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Remove a member assignment from a project."""
    project = await get_project(session, ctx, project_id)
    if user_id == ctx.user.id:
        raise BadRequestError("You cannot remove yourself from a project")
    member = await session.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id, ProjectMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("Project member not found")
    role_before = member.role.value
    remaining = await session.scalar(
        select(func.count())
        .select_from(ProjectMember)
        .where(ProjectMember.project_id == project.id)
    )
    if remaining is not None and remaining <= 1:
        raise BadRequestError("A project must keep at least one member")
    await session.delete(member)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project.id,
        event_type="member_removed",
        actor_id=ctx.user.id,
        project_id=project.id,
        payload={"user_id": str(user_id)},
    )
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.MEMBER_REMOVED,
        resource_scope=RbacResourceScope.PROJECT,
        resource_id=project.id,
        project_id=project.id,
        subject_user_id=user_id,
        role_before=role_before,
    )
    await session.flush()


async def list_artifacts(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[ProjectArtifact]:
    """List a project's linked artifacts."""
    await get_project(session, ctx, project_id)
    result = await session.scalars(
        select(ProjectArtifact)
        .where(ProjectArtifact.project_id == project_id)
        .order_by(ProjectArtifact.created_at)
    )
    return list(result)


async def add_artifact(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: ProjectArtifactIn
) -> ProjectArtifact:
    """Add a linked artifact to a project."""
    await get_project(session, ctx, project_id)
    artifact = ProjectArtifact(
        org_id=ctx.org.id,
        project_id=project_id,
        label=payload.label,
        url=payload.url,
        created_by=ctx.user.id,
    )
    session.add(artifact)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="project",
        entity_id=project_id,
        event_type="artifact_added",
        actor_id=ctx.user.id,
        payload={"label": artifact.label},
    )
    return artifact


async def delete_artifact(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, artifact_id: uuid.UUID
) -> None:
    """Remove a linked artifact from a project."""
    await get_project(session, ctx, project_id)
    artifact = await session.scalar(
        select(ProjectArtifact).where(
            ProjectArtifact.id == artifact_id,
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.org_id == ctx.org.id,
        )
    )
    if artifact is None:
        raise NotFoundError("Artifact not found")
    await session.delete(artifact)
    await session.flush()


async def list_project_members(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[ProjectMember]:
    """List member assignments of a project."""
    project = await get_project(session, ctx, project_id)
    result = await session.scalars(
        select(ProjectMember)
        .where(ProjectMember.project_id == project.id)
        .order_by(ProjectMember.created_at)
    )
    return list(result)


async def is_project_subscribed(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> bool:
    """Whether the current user opted into this project's notification stream."""
    sub = await session.scalar(
        select(ProjectSubscription.id).where(
            ProjectSubscription.project_id == project_id,
            ProjectSubscription.user_id == ctx.user.id,
        )
    )
    return sub is not None


async def set_project_subscription(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, *, subscribed: bool
) -> bool:
    """Opt the current user in or out of a project's notification stream."""
    project = await get_project(session, ctx, project_id)
    existing = await session.scalar(
        select(ProjectSubscription).where(
            ProjectSubscription.project_id == project.id,
            ProjectSubscription.user_id == ctx.user.id,
        )
    )
    if subscribed and existing is None:
        session.add(
            ProjectSubscription(org_id=ctx.org.id, project_id=project.id, user_id=ctx.user.id)
        )
    elif not subscribed and existing is not None:
        await session.delete(existing)
    await session.flush()
    return subscribed


async def create_project_update(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: ProjectUpdateCreateIn
) -> ProjectUpdate:
    """Post a project status update (RAG health + summary)."""
    await get_project(session, ctx, project_id)
    update = ProjectUpdate(
        org_id=ctx.org.id,
        project_id=project_id,
        health=payload.health,
        summary=payload.summary,
        created_by=ctx.user.id,
    )
    session.add(update)
    await session.flush()
    return update


async def list_project_updates(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[ProjectUpdate]:
    """List a project's status updates, newest first."""
    await get_project(session, ctx, project_id)
    result = await session.scalars(
        select(ProjectUpdate)
        .where(ProjectUpdate.project_id == project_id, ProjectUpdate.org_id == ctx.org.id)
        .order_by(ProjectUpdate.created_at.desc())
    )
    return list(result)


async def set_project_member_role(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    role: ProjectRole,
) -> ProjectMember:
    """Change a member's project role (admin only)."""
    member = await session.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.org_id == ctx.org.id,
        )
    )
    if member is None:
        raise NotFoundError("Project member not found")
    await _assert_project_role_within_org_ceiling(session, ctx, user_id, role)
    role_before = member.role.value
    member.role = role
    record_rbac_audit(
        session,
        org_id=ctx.org.id,
        actor_id=ctx.user.id,
        action=RbacAction.PROJECT_ROLE_CHANGED,
        resource_scope=RbacResourceScope.PROJECT,
        resource_id=project_id,
        project_id=project_id,
        subject_user_id=user_id,
        role_before=role_before,
        role_after=role.value,
    )
    await session.flush()
    return member


async def effective_project_role(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, user_id: uuid.UUID
) -> ProjectRole | None:
    """The user's effective role on a project, resolved across scopes.

    Effective access = max-of(direct ProjectMember role, team-derived role via
    a team_project_links link the user belongs to, team-lead elevation), with the
    workspace owner/admin bypass taking precedence. Non-members resolve to None.
    Nothing is persisted — removing a team membership or link simply changes the
    next computation, so direct/manual grants are never stripped.
    """
    org_member = await session.scalar(
        select(OrganizationMember.role).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if org_member in (OrgRole.OWNER, OrgRole.ADMIN):
        return ProjectRole.ADMIN
    candidates: list[ProjectRole] = []
    direct: ProjectRole | None = await session.scalar(
        select(ProjectMember.role).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.org_id == ctx.org.id,
        )
    )
    if direct is not None:
        candidates.append(direct)
    team_roles = await session.scalars(
        select(TeamProjectLink.role)
        .join(TeamMember, TeamMember.team_id == TeamProjectLink.team_id)
        .where(
            TeamProjectLink.project_id == project_id,
            TeamProjectLink.org_id == ctx.org.id,
            TeamMember.user_id == user_id,
        )
    )
    candidates.extend(team_roles)
    lead_link = await session.scalar(
        select(Team.id)
        .join(TeamProjectLink, TeamProjectLink.team_id == Team.id)
        .where(
            Team.lead_id == user_id,
            TeamProjectLink.project_id == project_id,
            TeamProjectLink.org_id == ctx.org.id,
        )
    )
    if lead_link is not None:
        candidates.append(ProjectRole.ADMIN)
    if not candidates:
        return None
    return max(candidates, key=lambda role: PROJECT_ROLE_RANK[role])


async def require_project_role(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    minimum: ProjectRole,
    *,
    user_id: uuid.UUID | None = None,
) -> ProjectRole:
    """Ensure a user meets a minimum project role, else 403."""
    role = await effective_project_role(session, ctx, project_id, user_id or ctx.user.id)
    if role is None or PROJECT_ROLE_RANK[role] < PROJECT_ROLE_RANK[minimum]:
        raise ForbiddenError("Insufficient project permissions")
    return role
