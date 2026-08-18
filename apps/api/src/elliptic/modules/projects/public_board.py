"""Publish a project as a public read-only board (COS-249)."""

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import STATUS_TO_CATEGORY, Task, TaskStatus

_ALLOWED_ATTRS = {"status", "priority", "assignee", "due_date", "labels"}


async def _owned(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id, Project.org_id == ctx.org.id, Project.deleted_at.is_(None)
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def publish(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, attributes: list[str]
) -> Project:
    project = await _owned(session, ctx, project_id)
    if project.public_token is None:
        project.public_token = secrets.token_urlsafe(24)
    project.public_attributes = [a for a in attributes if a in _ALLOWED_ATTRS]
    await session.flush()
    return project


async def update_attributes(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, attributes: list[str]
) -> Project:
    project = await _owned(session, ctx, project_id)
    project.public_attributes = [a for a in attributes if a in _ALLOWED_ATTRS]
    await session.flush()
    return project


async def unpublish(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    project = await _owned(session, ctx, project_id)
    project.public_token = None
    await session.flush()


async def read_public(session: AsyncSession, token: str) -> dict[str, object]:
    project = await session.scalar(
        select(Project).where(Project.public_token == token, Project.deleted_at.is_(None))
    )
    if project is None:
        raise NotFoundError("Published board not found")
    allowed = set(project.public_attributes or [])

    tasks = list(
        await session.scalars(
            select(Task)
            .where(
                Task.project_id == project.id,
                Task.archived_at.is_(None),
            )
            .order_by(Task.sort_order, Task.number)
        )
    )

    columns: dict[str, list[dict[str, object]]] = {s.value: [] for s in TaskStatus}
    for task in tasks:
        row: dict[str, object] = {
            "identifier": f"{project.key}-{task.number}",
            "title": task.title,
        }
        if "priority" in allowed:
            row["priority"] = task.priority.value
        if "assignee" in allowed:
            row["has_assignee"] = task.assignee_id is not None
        if "due_date" in allowed:
            row["due_date"] = task.due_date
        if "labels" in allowed:
            row["labels"] = [label.name for label in (task.labels or [])]
        columns[task.status.value].append(row)

    column_list = [
        {
            "status": status,
            "category": STATUS_TO_CATEGORY[TaskStatus(status)].value,
            "tasks": rows,
        }
        for status, rows in columns.items()
    ]
    return {
        "name": project.name,
        "key": project.key,
        "description": project.description,
        "attributes": sorted(allowed),
        "columns": column_list,
    }
