"""Inbound Slack slash command: /elliptic creates a work item (COS-266)."""

import hashlib
import hmac
import time
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.integrations.models import SlackConnection
from elliptic.modules.orgs.models import OrganizationMember, OrgRole
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import Task, TaskStatus

_MAX_SKEW_SECONDS = 300


def verify_slack_signature(
    signing_secret: str, timestamp: str, body: str, signature: str, *, now: float | None = None
) -> bool:
    """Verify a Slack request signature (v0 HMAC-SHA256). Constant-time."""
    if not signing_secret or not signature.startswith("v0="):
        return False
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    current = time.time() if now is None else now
    if abs(current - ts) > _MAX_SKEW_SECONDS:
        return False
    basestring = f"v0:{timestamp}:{body}".encode()
    digest = hmac.new(signing_secret.encode(), basestring, hashlib.sha256).hexdigest()
    expected = f"v0={digest}"
    return hmac.compare_digest(expected, signature)


async def handle_command(session: AsyncSession, *, team_id: str, user_text: str) -> dict[str, str]:
    """Create a work item from a /elliptic slash command in the team's default project."""
    text = user_text.strip()
    if not text:
        return {
            "response_type": "ephemeral",
            "text": "Usage: `/elliptic <work item title>`",
        }
    connection = await session.scalar(
        select(SlackConnection).where(SlackConnection.team_id == team_id)
    )
    if connection is None:
        return {
            "response_type": "ephemeral",
            "text": "This Slack workspace isn't connected to a Elliptic organization.",
        }
    if connection.default_project_id is None:
        return {
            "response_type": "ephemeral",
            "text": "No default project is set for Slack. An admin can set one in Integrations.",
        }
    project = await session.scalar(
        select(Project).where(
            Project.id == connection.default_project_id, Project.deleted_at.is_(None)
        )
    )
    if project is None:
        return {
            "response_type": "ephemeral",
            "text": "The configured default project no longer exists.",
        }
    number = await next_task_number(session, project)
    task = Task(
        org_id=connection.org_id,
        project_id=project.id,
        number=number,
        title=text[:500],
        status=TaskStatus.BACKLOG,
        created_by=None,
        labels=[],
    )
    session.add(task)
    await session.flush()
    return {
        "response_type": "in_channel",
        "text": f":white_check_mark: Created *{project.key}-{number}* — {task.title}",
    }


async def set_default_project(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID | None
) -> SlackConnection:
    """Admin sets the project that /elliptic files work items into."""
    from elliptic.core.exceptions import BadRequestError, NotFoundError  # noqa: PLC0415

    membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id,
            OrganizationMember.user_id == ctx.user.id,
        )
    )
    if membership is None or membership.role not in (OrgRole.OWNER, OrgRole.ADMIN):
        raise BadRequestError("Only admins can configure the Slack default project")
    connection = await session.scalar(
        select(SlackConnection).where(SlackConnection.org_id == ctx.org.id)
    )
    if connection is None:
        raise NotFoundError("Slack is not connected for this organization")
    if project_id is not None:
        project = await session.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.org_id == ctx.org.id,
                Project.deleted_at.is_(None),
            )
        )
        if project is None:
            raise NotFoundError("Project not found")
    connection.default_project_id = project_id
    await session.flush()
    return connection
