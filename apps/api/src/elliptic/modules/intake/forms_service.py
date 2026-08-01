"""Custom intake form business logic (COS-51)."""

import secrets
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.intake.models import IntakeForm
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import Task, TaskKind, TaskStatus

_FIELD_TYPES = {"text", "textarea", "select"}


def _normalize_fields(fields: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate + normalize the field config (key/label/type/required/options)."""
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, field in enumerate(fields):
        label = str(field.get("label", "")).strip()
        if not label:
            raise BadRequestError("Each field needs a label")
        field_type = str(field.get("type", "text"))
        if field_type not in _FIELD_TYPES:
            raise BadRequestError(f"Unknown field type: {field_type}")
        key = str(field.get("key") or label).lower().replace(" ", "_")[:40] or f"field_{index}"
        while key in seen:
            key = f"{key}_{index}"
        seen.add(key)
        normalized.append(
            {
                "key": key,
                "label": label[:120],
                "type": field_type,
                "required": bool(field.get("required", False)),
                "options": [str(o)[:80] for o in field.get("options", [])][:20],
            }
        )
    return normalized


async def _project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id, Project.org_id == ctx.org.id, Project.deleted_at.is_(None)
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def list_forms(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[IntakeForm]:
    await _project(session, ctx, project_id)
    result = await session.scalars(
        select(IntakeForm)
        .where(IntakeForm.project_id == project_id, IntakeForm.org_id == ctx.org.id)
        .order_by(IntakeForm.created_at.desc())
    )
    return list(result)


async def create_form(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    *,
    name: str,
    fields: list[dict[str, Any]],
) -> IntakeForm:
    await _project(session, ctx, project_id)
    form = IntakeForm(
        org_id=ctx.org.id,
        project_id=project_id,
        name=name,
        token=secrets.token_urlsafe(24),
        fields=_normalize_fields(fields),
    )
    session.add(form)
    await session.flush()
    return form


async def update_form(
    session: AsyncSession,
    ctx: OrgContext,
    form_id: uuid.UUID,
    *,
    name: str | None,
    fields: list[dict[str, Any]] | None,
    enabled: bool | None,
) -> IntakeForm:
    form = await session.scalar(
        select(IntakeForm).where(IntakeForm.id == form_id, IntakeForm.org_id == ctx.org.id)
    )
    if form is None:
        raise NotFoundError("Form not found")
    if name is not None:
        form.name = name
    if fields is not None:
        form.fields = _normalize_fields(fields)
    if enabled is not None:
        form.enabled = enabled
    await session.flush()
    return form


async def delete_form(session: AsyncSession, ctx: OrgContext, form_id: uuid.UUID) -> None:
    form = await session.scalar(
        select(IntakeForm).where(IntakeForm.id == form_id, IntakeForm.org_id == ctx.org.id)
    )
    if form is None:
        raise NotFoundError("Form not found")
    await session.delete(form)
    await session.flush()


async def get_public_form(session: AsyncSession, token: str) -> IntakeForm:
    form = await session.scalar(
        select(IntakeForm).where(IntakeForm.token == token, IntakeForm.enabled.is_(True))
    )
    if form is None:
        raise NotFoundError("Form not found")
    return form


async def submit_public_form(
    session: AsyncSession, token: str, title: str, answers: dict[str, str]
) -> str:
    """Render the answers into a triage task in the form's project (COS-51)."""
    form = await get_public_form(session, token)
    project = await session.scalar(
        select(Project).where(Project.id == form.project_id, Project.deleted_at.is_(None))
    )
    if project is None:
        raise NotFoundError("Form not found")
    for field in form.fields:
        if field.get("required") and not str(answers.get(field["key"], "")).strip():
            raise BadRequestError(f"{field['label']} is required")
    lines = [
        f"**{field['label']}:** {answers.get(field['key'], '').strip()}"
        for field in form.fields
        if answers.get(field["key"], "").strip()
    ]
    description = f"Submitted via intake form: {form.name}\n\n" + "\n\n".join(lines)
    number = await next_task_number(session, project)
    task = Task(
        org_id=form.org_id,
        project_id=project.id,
        number=number,
        title=title[:500] or form.name,
        description=description,
        status=TaskStatus.BACKLOG,
        kind=TaskKind.TASK,
        is_triage=True,
        intake_channel="form",
        created_by=None,
        labels=[],
    )
    session.add(task)
    await session.flush()
    return f"{project.key}-{number}"
