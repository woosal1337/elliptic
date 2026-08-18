"""Inbound Sentry alert intake → triage bug (COS-260)."""

import secrets
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.integrations.models import SentryIntake
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import BugSeverity, Task, TaskKind, TaskStatus

_LEVEL_SEVERITY = {
    "fatal": BugSeverity.CRITICAL,
    "error": BugSeverity.HIGH,
    "warning": BugSeverity.MEDIUM,
    "info": BugSeverity.LOW,
}


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
) -> list[SentryIntake]:
    await _project(session, ctx, project_id)
    result = await session.scalars(
        select(SentryIntake).where(
            SentryIntake.project_id == project_id, SentryIntake.org_id == ctx.org.id
        )
    )
    return list(result)


async def create_intake(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> SentryIntake:
    await _project(session, ctx, project_id)
    intake = SentryIntake(org_id=ctx.org.id, project_id=project_id, token=secrets.token_urlsafe(24))
    session.add(intake)
    await session.flush()
    return intake


async def delete_intake(session: AsyncSession, ctx: OrgContext, intake_id: uuid.UUID) -> None:
    intake = await session.scalar(
        select(SentryIntake).where(SentryIntake.id == intake_id, SentryIntake.org_id == ctx.org.id)
    )
    if intake is None:
        raise NotFoundError("Sentry intake not found")
    await session.delete(intake)
    await session.flush()


def _extract(payload: dict[str, Any]) -> tuple[str, str, str]:
    """Pull (title, level, body) from a Sentry webhook payload (issue or event alert)."""
    data = payload.get("data", payload)
    issue = data.get("issue") or data.get("event") or {}
    title = (
        issue.get("title")
        or payload.get("message")
        or issue.get("metadata", {}).get("value")
        or "Sentry alert"
    )
    level = (issue.get("level") or payload.get("level") or "error").lower()
    culprit = issue.get("culprit") or issue.get("transaction") or ""
    url = issue.get("web_url") or issue.get("url") or payload.get("url") or ""
    body_lines = []
    if culprit:
        body_lines.append(f"**Culprit:** {culprit}")
    if url:
        body_lines.append(f"**Sentry:** {url}")
    return str(title)[:500], level, "\n\n".join(body_lines) or "Imported from Sentry."


async def ingest(session: AsyncSession, token: str, payload: dict[str, Any]) -> str:
    """Create a triage bug from a Sentry webhook (public, token-authenticated)."""
    intake = await session.scalar(
        select(SentryIntake).where(SentryIntake.token == token, SentryIntake.enabled.is_(True))
    )
    if intake is None:
        raise NotFoundError("Sentry intake not found")
    project = await session.scalar(
        select(Project).where(Project.id == intake.project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise NotFoundError("Sentry intake not found")
    title, level, body = _extract(payload)
    number = await next_task_number(session, project)
    task = Task(
        org_id=intake.org_id,
        project_id=project.id,
        number=number,
        title=title,
        description=body,
        status=TaskStatus.BACKLOG,
        kind=TaskKind.BUG,
        severity=_LEVEL_SEVERITY.get(level, BugSeverity.MEDIUM),
        created_by=None,
        labels=[],
    )
    session.add(task)
    await session.flush()
    return f"{project.key}-{number}"
