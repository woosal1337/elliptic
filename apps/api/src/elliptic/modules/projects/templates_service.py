"""Project template business logic: snapshot a project + instantiate a new one."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.projects.models import (
    Project,
    ProjectNetwork,
    ProjectTemplate,
)
from elliptic.modules.projects.schemas import ProjectCreateIn
from elliptic.modules.projects.service import create_project, get_project, next_task_number
from elliptic.modules.tasks.models import Task, TaskKind, TaskPriority, TaskStatus

_SEED_ITEM_CAP = 100


async def save_as_template(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    name: str,
    description: str | None,
) -> ProjectTemplate:
    """Snapshot a project's config + its current work items into a reusable template."""
    project = await get_project(session, ctx, project_id)
    clash = await session.scalar(
        select(ProjectTemplate.id).where(
            ProjectTemplate.org_id == ctx.org.id, ProjectTemplate.name == name
        )
    )
    if clash is not None:
        raise ConflictError("A template with this name already exists")
    tasks = list(
        await session.scalars(
            select(Task)
            .where(
                Task.project_id == project.id,
                Task.is_triage.is_(False),
                Task.archived_at.is_(None),
                Task.parent_task_id.is_(None),
            )
            .order_by(Task.sort_order, Task.number)
            .limit(_SEED_ITEM_CAP)
        )
    )
    config: dict[str, Any] = {
        "network": project.network.value,
        "features": dict(project.features),
        "estimate_scale": list(project.estimate_scale),
        "labels": list(project.labels),
        "seed_items": [
            {
                "title": task.title,
                "status": task.status.value,
                "priority": task.priority.value,
                "kind": task.kind.value,
            }
            for task in tasks
        ],
    }
    template = ProjectTemplate(
        org_id=ctx.org.id,
        name=name,
        description=description,
        config=config,
        created_by=ctx.user.id,
    )
    session.add(template)
    await session.flush()
    return template


async def list_templates(session: AsyncSession, ctx: OrgContext) -> list[ProjectTemplate]:
    """List the org's project templates."""
    result = await session.scalars(
        select(ProjectTemplate)
        .where(ProjectTemplate.org_id == ctx.org.id)
        .order_by(ProjectTemplate.name)
    )
    return list(result)


async def delete_template(session: AsyncSession, ctx: OrgContext, template_id: uuid.UUID) -> None:
    """Delete a project template."""
    template = await session.scalar(
        select(ProjectTemplate).where(
            ProjectTemplate.id == template_id, ProjectTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Template not found")
    await session.delete(template)
    await session.flush()


async def instantiate_template(
    session: AsyncSession,
    ctx: OrgContext,
    template_id: uuid.UUID,
    *,
    name: str,
    key: str,
) -> Project:
    """Create a ready-to-run project from a template's snapshot."""
    template = await session.scalar(
        select(ProjectTemplate).where(
            ProjectTemplate.id == template_id, ProjectTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Template not found")
    config: dict[str, Any] = template.config or {}
    network = _coerce(config.get("network"), ProjectNetwork, ProjectNetwork.PRIVATE)
    project = await create_project(
        session,
        ctx,
        ProjectCreateIn(name=name, key=key, network=network),
    )
    if isinstance(config.get("features"), dict):
        project.features = {k: bool(v) for k, v in config["features"].items()}
    if isinstance(config.get("estimate_scale"), list):
        project.estimate_scale = [str(v) for v in config["estimate_scale"]]
    if isinstance(config.get("labels"), list):
        project.labels = [str(v) for v in config["labels"]]
    await session.flush()

    for item in config.get("seed_items", []) or []:
        if not isinstance(item, dict) or not item.get("title"):
            continue
        number = await next_task_number(session, project)
        session.add(
            Task(
                org_id=ctx.org.id,
                project_id=project.id,
                number=number,
                title=str(item["title"])[:500],
                status=_coerce(item.get("status"), TaskStatus, TaskStatus.BACKLOG),
                priority=_coerce(item.get("priority"), TaskPriority, TaskPriority.NONE),
                kind=_coerce(item.get("kind"), TaskKind, TaskKind.TASK),
                created_by=ctx.user.id,
                labels=[],
            )
        )
    await session.flush()
    return project


def _coerce(value: Any, enum_cls: Any, default: Any) -> Any:
    if isinstance(value, str):
        try:
            return enum_cls(value)
        except ValueError:
            return default
    return default
