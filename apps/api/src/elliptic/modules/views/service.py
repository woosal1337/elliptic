"""Saved task view business logic."""

import uuid
from contextlib import suppress

from sqlalchemy import Select, and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.orgs.models import ROLE_ORDER, OrgRole
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task, TaskStatus, task_labels
from elliptic.modules.teams.models import Team, TeamMember, TeamProjectLink
from elliptic.modules.views.models import TaskView
from elliptic.modules.views.schemas import TaskViewIn, TaskViewOut, TaskViewUpdateIn


def _is_admin(ctx: OrgContext) -> bool:
    return ROLE_ORDER[ctx.role] >= ROLE_ORDER[OrgRole.ADMIN]


async def _is_team_member(session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID) -> bool:
    member = await session.scalar(
        select(TeamMember.id).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == ctx.user.id,
            TeamMember.org_id == ctx.org.id,
        )
    )
    return member is not None


def _scope_of(view: TaskView) -> str:
    if view.owner_id is not None:
        return "personal"
    return "teamspace" if view.team_id is not None else "team"


def view_to_out(view: TaskView) -> TaskViewOut:
    """Serialize a view, deriving its personal/team/teamspace scope."""
    return TaskViewOut.model_validate(
        {
            "id": view.id,
            "name": view.name,
            "config": view.config,
            "scope": _scope_of(view),
            "team_id": view.team_id,
            "is_default": view.is_default,
            "owner_id": view.owner_id,
            "created_at": view.created_at,
        }
    )


def _visible_views_clause(ctx: OrgContext):  # type: ignore[no-untyped-def]
    """Views the caller may see: org-wide team, own personal, or teamspaces they're in."""
    member_teams = select(TeamMember.team_id).where(
        TeamMember.user_id == ctx.user.id, TeamMember.org_id == ctx.org.id
    )
    return or_(
        and_(TaskView.owner_id.is_(None), TaskView.team_id.is_(None)),
        TaskView.owner_id == ctx.user.id,
        TaskView.team_id.in_(member_teams),
    )


async def list_views(session: AsyncSession, ctx: OrgContext) -> list[TaskView]:
    """List the caller's personal views, org-wide team views, and their teamspace views."""
    result = await session.scalars(
        select(TaskView)
        .where(TaskView.org_id == ctx.org.id, _visible_views_clause(ctx))
        .order_by(TaskView.name)
    )
    return list(result)


async def _get_view(session: AsyncSession, ctx: OrgContext, view_id: uuid.UUID) -> TaskView:
    view = await session.scalar(
        select(TaskView).where(
            TaskView.id == view_id,
            TaskView.org_id == ctx.org.id,
            _visible_views_clause(ctx),
        )
    )
    if view is None and _is_admin(ctx):
        view = await session.scalar(
            select(TaskView).where(TaskView.id == view_id, TaskView.org_id == ctx.org.id)
        )
    if view is None:
        raise NotFoundError("View not found")
    return view


async def _assert_can_mutate(session: AsyncSession, view: TaskView, ctx: OrgContext) -> None:
    if view.owner_id is not None:
        if view.owner_id != ctx.user.id:
            raise ForbiddenError("Only the owner can modify a personal view")
        return
    if view.team_id is not None:
        if not _is_admin(ctx) and not await _is_team_member(session, ctx, view.team_id):
            raise ForbiddenError("Only a team member or an admin can modify a teamspace view")
        return
    if not _is_admin(ctx):
        raise ForbiddenError("Only an admin can modify a team view")


async def _clear_defaults(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    owner_id: uuid.UUID | None,
    team_id: uuid.UUID | None,
) -> None:
    if team_id is not None:
        scope = TaskView.team_id == team_id
    elif owner_id is not None:
        scope = TaskView.owner_id == owner_id
    else:
        scope = and_(TaskView.owner_id.is_(None), TaskView.team_id.is_(None))
    await session.execute(
        update(TaskView).where(TaskView.org_id == ctx.org.id, scope).values(is_default=False)
    )


async def create_view(session: AsyncSession, ctx: OrgContext, payload: TaskViewIn) -> TaskView:
    """Save a personal, org-team, or teamspace view."""
    owner_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None
    if payload.scope == "personal":
        owner_id = ctx.user.id
    elif payload.scope == "teamspace":
        team_id = payload.team_id
        team = await session.scalar(
            select(Team.id).where(Team.id == team_id, Team.org_id == ctx.org.id)
        )
        if team is None:
            raise BadRequestError("Team not found in this organization")
        if not _is_admin(ctx) and not await _is_team_member(session, ctx, team_id):  # type: ignore[arg-type]
            raise ForbiddenError("Only a team member or an admin can create a teamspace view")
    elif not _is_admin(ctx):
        raise ForbiddenError("Only an admin can create a team view")
    if payload.is_default:
        await _clear_defaults(session, ctx, owner_id=owner_id, team_id=team_id)
    view = TaskView(
        org_id=ctx.org.id,
        owner_id=owner_id,
        team_id=team_id,
        name=payload.name,
        config=payload.config,
        is_default=payload.is_default,
        created_by=ctx.user.id,
    )
    session.add(view)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="view",
        entity_id=view.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": view.name, "scope": payload.scope},
    )
    return view


async def update_view(
    session: AsyncSession, ctx: OrgContext, view_id: uuid.UUID, payload: TaskViewUpdateIn
) -> TaskView:
    """Apply provided fields to a view the caller may modify."""
    view = await _get_view(session, ctx, view_id)
    await _assert_can_mutate(session, view, ctx)
    fields = payload.model_fields_set
    if "name" in fields and payload.name is not None:
        view.name = payload.name
    if "config" in fields and payload.config is not None:
        view.config = payload.config
    if "is_default" in fields and payload.is_default is not None:
        if payload.is_default:
            await _clear_defaults(session, ctx, owner_id=view.owner_id, team_id=view.team_id)
        view.is_default = payload.is_default
    await session.flush()
    return view


async def resolve_team_view_dataset(
    session: AsyncSession, ctx: OrgContext, view_id: uuid.UUID
) -> list[tuple[Task, str]]:
    """Return (task, project_key) across all projects linked to a teamspace view's team.

    Visibility rides on team membership (enforced by _get_view): a member sees
    the whole union — the dataset is NOT re-gated per project.
    """
    view = await _get_view(session, ctx, view_id)
    if view.team_id is None:
        raise BadRequestError("Not a teamspace view")
    project_ids: list[uuid.UUID] = list(
        await session.scalars(
            select(TeamProjectLink.project_id).where(
                TeamProjectLink.team_id == view.team_id, TeamProjectLink.org_id == ctx.org.id
            )
        )
    )
    if not project_ids:
        return []
    query: Select[tuple[Task, str]] = (
        select(Task, Project.key)
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.org_id == ctx.org.id,
            Task.project_id.in_(project_ids),
            Task.archived_at.is_(None),
        )
    )
    config = view.config or {}
    raw_status = config.get("status")
    if isinstance(raw_status, str):
        with suppress(ValueError):
            query = query.where(Task.status == TaskStatus(raw_status))
    raw_assignee = config.get("assignee_id")
    if isinstance(raw_assignee, str):
        with suppress(ValueError):
            query = query.where(Task.assignee_id == uuid.UUID(raw_assignee))
    raw_label = config.get("label_id")
    if isinstance(raw_label, str):
        try:
            label_uuid = uuid.UUID(raw_label)
        except ValueError:
            label_uuid = None
        if label_uuid is not None:
            query = query.join(task_labels, task_labels.c.task_id == Task.id).where(
                task_labels.c.label_id == label_uuid
            )
    raw_search = config.get("search")
    if isinstance(raw_search, str) and raw_search:
        pattern = f"%{raw_search}%"
        query = query.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    result = await session.execute(
        query.options(selectinload(Task.labels)).order_by(Task.sort_order, Task.number)
    )
    return [(task, key) for task, key in result]


async def delete_view(session: AsyncSession, ctx: OrgContext, view_id: uuid.UUID) -> None:
    """Delete a view the caller may modify."""
    view = await _get_view(session, ctx, view_id)
    await _assert_can_mutate(session, view, ctx)
    await session.delete(view)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="view",
        entity_id=view_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": view.name},
    )
    await session.flush()


def _apply_view_config(
    query: "Select[tuple[Task, str]]", config: dict[str, object]
) -> "Select[tuple[Task, str]]":
    """Apply a view's stored filter config to a (Task, project_key) query (COS-167)."""
    raw_status = config.get("status")
    if isinstance(raw_status, str):
        with suppress(ValueError):
            query = query.where(Task.status == TaskStatus(raw_status))
    raw_assignee = config.get("assignee_id")
    if isinstance(raw_assignee, str):
        with suppress(ValueError):
            query = query.where(Task.assignee_id == uuid.UUID(raw_assignee))
    raw_label = config.get("label_id")
    if isinstance(raw_label, str):
        try:
            label_uuid = uuid.UUID(raw_label)
        except ValueError:
            label_uuid = None
        if label_uuid is not None:
            query = query.join(task_labels, task_labels.c.task_id == Task.id).where(
                task_labels.c.label_id == label_uuid
            )
    raw_search = config.get("search")
    if isinstance(raw_search, str) and raw_search:
        pattern = f"%{raw_search}%"
        query = query.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    return query


async def publish_view(session: AsyncSession, ctx: OrgContext, view_id: uuid.UUID) -> TaskView:
    """Generate (or keep) a public read-only link token for a view."""
    view = await _get_view(session, ctx, view_id)
    await _assert_can_mutate(session, view, ctx)
    if view.public_token is None:
        import secrets  # noqa: PLC0415

        view.public_token = secrets.token_urlsafe(24)
        await session.flush()
    return view


async def unpublish_view(session: AsyncSession, ctx: OrgContext, view_id: uuid.UUID) -> None:
    """Revoke a view's public link."""
    view = await _get_view(session, ctx, view_id)
    await _assert_can_mutate(session, view, ctx)
    view.public_token = None
    await session.flush()


async def public_view(session: AsyncSession, token: str) -> TaskView:
    view = await session.scalar(select(TaskView).where(TaskView.public_token == token))
    if view is None:
        raise NotFoundError("Published view not found")
    return view


async def public_view_dataset(session: AsyncSession, view: TaskView) -> list[tuple[Task, str]]:
    """Resolve a published view's read-only task dataset by token (no auth, no per-user gate)."""
    query: Select[tuple[Task, str]] = (
        select(Task, Project.key)
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.org_id == view.org_id,
            Task.archived_at.is_(None),
        )
    )
    if view.team_id is not None:
        project_ids: list[uuid.UUID] = list(
            await session.scalars(
                select(TeamProjectLink.project_id).where(
                    TeamProjectLink.team_id == view.team_id,
                    TeamProjectLink.org_id == view.org_id,
                )
            )
        )
        if not project_ids:
            return []
        query = query.where(Task.project_id.in_(project_ids))
    query = _apply_view_config(query, view.config or {})
    result = await session.execute(
        query.options(selectinload(Task.labels)).order_by(Task.sort_order, Task.number)
    )
    return [(task, key) for task, key in result]
