"""Inbound email intake → triage task (COS-62).

A per-project token-authenticated endpoint that turns a forwarded email (subject
+ body + sender, posted by an email provider's inbound-parse webhook) into a
triage task. There is no SMTP server here — delivery is via the provider webhook.
"""

import secrets
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.integrations.models import EmailIntake
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import Task, TaskKind, TaskStatus


async def _project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id, Project.org_id == ctx.org.id, Project.deleted_at.is_(None)
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def list_intakes(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[EmailIntake]:
    await _project(session, ctx, project_id)
    result = await session.scalars(
        select(EmailIntake).where(
            EmailIntake.project_id == project_id, EmailIntake.org_id == ctx.org.id
        )
    )
    return list(result)


async def create_intake(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> EmailIntake:
    await _project(session, ctx, project_id)
    intake = EmailIntake(org_id=ctx.org.id, project_id=project_id, token=secrets.token_urlsafe(24))
    session.add(intake)
    await session.flush()
    return intake


async def delete_intake(session: AsyncSession, ctx: OrgContext, intake_id: uuid.UUID) -> None:
    intake = await session.scalar(
        select(EmailIntake).where(EmailIntake.id == intake_id, EmailIntake.org_id == ctx.org.id)
    )
    if intake is None:
        raise NotFoundError("Email intake not found")
    await session.delete(intake)
    await session.flush()


def _extract(payload: dict[str, Any]) -> tuple[str, str]:
    """Pull (title, body) from an inbound-email webhook payload."""
    subject = str(payload.get("subject") or payload.get("Subject") or "Email request")[:500]
    sender = str(payload.get("from") or payload.get("sender") or payload.get("From") or "")
    text = str(payload.get("text") or payload.get("body") or payload.get("html") or "")
    body_lines = []
    if sender:
        body_lines.append(f"**From:** {sender}")
    if text:
        body_lines.append(text.strip())
    return subject, "\n\n".join(body_lines) or "Imported from email."


async def ingest(session: AsyncSession, token: str, payload: dict[str, Any]) -> str:
    """Create a triage task from an inbound email (public, token-authenticated)."""
    intake = await session.scalar(
        select(EmailIntake).where(EmailIntake.token == token, EmailIntake.enabled.is_(True))
    )
    if intake is None:
        raise NotFoundError("Email intake not found")
    project = await session.scalar(
        select(Project).where(Project.id == intake.project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise NotFoundError("Email intake not found")
    title, body = _extract(payload)
    number = await next_task_number(session, project)
    task = Task(
        org_id=intake.org_id,
        project_id=project.id,
        number=number,
        title=title,
        description=body,
        status=TaskStatus.BACKLOG,
        kind=TaskKind.TASK,
        created_by=None,
        labels=[],
    )
    session.add(task)
    await session.flush()
    return f"{project.key}-{number}"
