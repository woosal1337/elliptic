"""Public intake form business logic."""

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.intake.schemas import IntakeSubmitIn
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from elliptic.modules.orgs.models import Organization, OrganizationMember, OrgRole
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import Task, TaskKind, TaskStatus


async def _get_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def enable_intake(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    """Turn on the public intake form, minting a token on first enable."""
    project = await _get_project(session, ctx, project_id)
    project.intake_enabled = True
    if not project.intake_token:
        project.intake_token = secrets.token_urlsafe(24)
    await session.flush()
    return project


async def disable_intake(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    """Turn off the public intake form (the token is preserved but inactive)."""
    project = await _get_project(session, ctx, project_id)
    project.intake_enabled = False
    await session.flush()
    return project


async def _resolve_intake_project(session: AsyncSession, token: str) -> Project:
    project = await session.scalar(
        select(Project)
        .where(
            Project.intake_token == token,
            Project.intake_enabled.is_(True),
            Project.deleted_at.is_(None),
        )
        .with_for_update()
    )
    if project is None:
        raise NotFoundError("Intake form not found")
    return project


async def get_intake_form(session: AsyncSession, token: str) -> tuple[str, str]:
    """Return (project_name, org_name) for an active intake token."""
    project = await session.scalar(
        select(Project).where(
            Project.intake_token == token,
            Project.intake_enabled.is_(True),
            Project.deleted_at.is_(None),
        )
    )
    if project is None:
        raise NotFoundError("Intake form not found")
    org_name = await session.scalar(
        select(Organization.name).where(Organization.id == project.org_id)
    )
    return project.name, org_name or ""


async def submit_intake(session: AsyncSession, token: str, payload: IntakeSubmitIn) -> str:
    """Create a triage task from a no-account submission; return its identifier."""
    project = await _resolve_intake_project(session, token)
    number = await next_task_number(session, project)

    intake_assignee = project.intake_owner_id
    if intake_assignee is not None:
        owner_role = await session.scalar(
            select(OrganizationMember.role).where(
                OrganizationMember.org_id == project.org_id,
                OrganizationMember.user_id == intake_assignee,
            )
        )
        if owner_role is OrgRole.GUEST:
            intake_assignee = None

    description = payload.description or ""
    if payload.submitter_email or payload.submitter_name:
        who = payload.submitter_name or "Anonymous"
        contact = f" <{payload.submitter_email}>" if payload.submitter_email else ""
        description = f"{description}\n\n— Submitted via intake form by {who}{contact}".strip()

    task = Task(
        org_id=project.org_id,
        project_id=project.id,
        number=number,
        title=payload.title[:500],
        description=description or None,
        status=TaskStatus.BACKLOG,
        kind=TaskKind.TASK,
        is_triage=True,
        intake_channel="form",
        assignee_id=intake_assignee,
        created_by=None,
    )
    session.add(task)
    await session.flush()

    await record_activity(
        session,
        org_id=project.org_id,
        entity_type="task",
        entity_id=task.id,
        event_type="created",
        actor_id=None,
        project_id=project.id,
        payload={"identifier": f"{project.key}-{number}", "title": task.title, "source": "intake"},
    )
    if project.intake_owner_id is not None:
        await notify(
            session,
            org_id=project.org_id,
            recipient_id=project.intake_owner_id,
            type=NotificationType.ASSIGNED,
            entity_type="task",
            entity_id=task.id,
            actor_id=None,
            title=f"New intake submission in {project.name}",
            snippet=task.title,
        )
    return f"{project.key}-{number}"


async def get_project_for_intake(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> Project:
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


async def set_inapp_intake(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, enabled: bool
) -> Project:
    """Toggle the in-app intake channel (member/guest submissions) for a project."""
    project = await get_project_for_intake(session, ctx, project_id)
    project.intake_inapp_enabled = enabled
    await session.flush()
    return project


async def submit_inapp_intake(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: IntakeSubmitIn
) -> Task:
    """Create an in-app intake request (lands in triage), tagged with its channel."""
    project = await get_project_for_intake(session, ctx, project_id)
    if not project.intake_inapp_enabled:
        raise NotFoundError("In-app intake is not enabled for this project")
    number = await next_task_number(session, project)
    task = Task(
        org_id=project.org_id,
        project_id=project.id,
        number=number,
        title=payload.title[:500],
        description=payload.description or None,
        status=TaskStatus.BACKLOG,
        kind=TaskKind.TASK,
        is_triage=True,
        intake_channel="in_app",
        created_by=ctx.user.id,
        labels=[],
    )
    session.add(task)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=task.id,
        event_type="created",
        actor_id=ctx.user.id,
        project_id=project.id,
        payload={"title": task.title, "intake_channel": "in_app"},
    )
    return task
