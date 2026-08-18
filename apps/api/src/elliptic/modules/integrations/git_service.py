"""Inbound Git (GitHub) issue/PR sync (COS-256)."""

import re
import secrets
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.integrations.git_models import GitRepoConnection
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import STATUS_TO_CATEGORY, Task, TaskKind, TaskLink, TaskStatus

_KEYWORD_RE = re.compile(
    r"\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\b\s+#?([A-Za-z]+-\d+)",
    re.IGNORECASE,
)


async def _project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id, Project.org_id == ctx.org.id, Project.deleted_at.is_(None)
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def list_connections(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[GitRepoConnection]:
    await _project(session, ctx, project_id)
    result = await session.scalars(
        select(GitRepoConnection).where(
            GitRepoConnection.project_id == project_id, GitRepoConnection.org_id == ctx.org.id
        )
    )
    return list(result)


async def create_connection(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, *, owner: str, repo: str
) -> GitRepoConnection:
    await _project(session, ctx, project_id)
    connection = GitRepoConnection(
        org_id=ctx.org.id,
        project_id=project_id,
        owner=owner,
        repo=repo,
        token=secrets.token_urlsafe(24),
    )
    session.add(connection)
    await session.flush()
    return connection


async def delete_connection(
    session: AsyncSession, ctx: OrgContext, connection_id: uuid.UUID
) -> None:
    connection = await session.scalar(
        select(GitRepoConnection).where(
            GitRepoConnection.id == connection_id, GitRepoConnection.org_id == ctx.org.id
        )
    )
    if connection is None:
        raise NotFoundError("Git connection not found")
    await session.delete(connection)
    await session.flush()


async def _task_by_identifier(
    session: AsyncSession, org_id: uuid.UUID, identifier: str
) -> Task | None:
    key, _, number = identifier.rpartition("-")
    if not key or not number.isdigit():
        return None
    project = await session.scalar(
        select(Project).where(Project.org_id == org_id, func.upper(Project.key) == key.upper())
    )
    if project is None:
        return None
    task: Task | None = await session.scalar(
        select(Task).where(
            Task.project_id == project.id, Task.number == int(number), Task.org_id == org_id
        )
    )
    return task


async def ingest(
    session: AsyncSession, token: str, event: str, payload: dict[str, Any]
) -> dict[str, object]:
    """Handle a GitHub webhook: issues -> triage task, PR/push -> link + auto-close (COS-256)."""
    connection = await session.scalar(
        select(GitRepoConnection).where(
            GitRepoConnection.token == token, GitRepoConnection.enabled.is_(True)
        )
    )
    if connection is None:
        raise NotFoundError("Git connection not found")
    org_id = connection.org_id

    if event == "issues":
        return await _handle_issue(session, connection, payload)
    if event == "pull_request":
        return await _handle_pull_request(session, org_id, payload)
    if event == "push":
        return await _handle_push(session, org_id, payload)
    return {"handled": False, "event": event}


async def _handle_issue(
    session: AsyncSession, connection: GitRepoConnection, payload: dict[str, Any]
) -> dict[str, object]:
    issue = payload.get("issue") or {}
    action = str(payload.get("action") or "")
    external_id = str(issue.get("id") or "")
    title = str(issue.get("title") or "GitHub issue")[:500]
    body = str(issue.get("body") or "")
    existing = await session.scalar(
        select(Task).where(
            Task.org_id == connection.org_id,
            Task.external_source == "github",
            Task.external_id == external_id,
        )
    )
    if existing is not None:
        existing.title = title
        existing.description = body
        await session.flush()
        return {"handled": True, "action": "updated", "task_id": str(existing.id)}
    if action not in ("opened", "reopened"):
        return {"handled": False, "action": action}
    project = await session.scalar(
        select(Project).where(Project.id == connection.project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise NotFoundError("Project not found")
    number = await next_task_number(session, project)
    task = Task(
        org_id=connection.org_id,
        project_id=project.id,
        number=number,
        title=title,
        description=body,
        status=TaskStatus.BACKLOG,
        kind=TaskKind.TASK,
        external_source="github",
        external_id=external_id,
        created_by=None,
        labels=[],
    )
    session.add(task)
    await session.flush()
    return {"handled": True, "action": "created", "reference": f"{project.key}-{number}"}


async def _link_and_close(
    session: AsyncSession, org_id: uuid.UUID, text_blob: str, url: str, *, close: bool
) -> list[str]:
    linked: list[str] = []
    for identifier in {m.group(1) for m in _KEYWORD_RE.finditer(text_blob or "")}:
        task = await _task_by_identifier(session, org_id, identifier)
        if task is None:
            continue
        already = await session.scalar(
            select(TaskLink).where(TaskLink.task_id == task.id, TaskLink.url == url)
        )
        if already is None and url:
            session.add(TaskLink(org_id=org_id, task_id=task.id, url=url, title="Git"))
        if close and STATUS_TO_CATEGORY[task.status].value != "completed":
            task.status = TaskStatus.DONE
        linked.append(identifier.upper())
    await session.flush()
    return linked


async def _handle_pull_request(
    session: AsyncSession, org_id: uuid.UUID, payload: dict[str, Any]
) -> dict[str, object]:
    pr = payload.get("pull_request") or {}
    action = str(payload.get("action") or "")
    merged = bool(pr.get("merged"))
    blob = f"{pr.get('title', '')}\n{pr.get('body', '')}\n{(pr.get('head') or {}).get('ref', '')}"
    url = str(pr.get("html_url") or "")
    linked = await _link_and_close(
        session, org_id, blob, url, close=(action == "closed" and merged)
    )
    return {"handled": True, "linked": linked, "closed": action == "closed" and merged}


async def _handle_push(
    session: AsyncSession, org_id: uuid.UUID, payload: dict[str, Any]
) -> dict[str, object]:
    ref = str(payload.get("ref") or "")
    commits = payload.get("commits") or []
    messages = " ".join(str(c.get("message") or "") for c in commits if isinstance(c, dict))
    url = str(payload.get("compare") or "")
    linked = await _link_and_close(session, org_id, f"{ref}\n{messages}", url, close=False)
    return {"handled": True, "linked": linked}


def branch_name(project_key: str, number: int, title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40].strip("-")
    return f"{project_key.lower()}-{number}-{slug}" if slug else f"{project_key.lower()}-{number}"
