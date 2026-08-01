"""Page (note) template business logic (COS-245)."""

import uuid

from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.notes.models import Note, NoteTemplate


async def list_note_templates(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID | None
) -> list[NoteTemplate]:
    """List org-wide templates plus, when given, the project's own templates."""
    scope: ColumnElement[bool] = NoteTemplate.project_id.is_(None)
    if project_id is not None:
        scope = or_(scope, NoteTemplate.project_id == project_id)
    result = await session.scalars(
        select(NoteTemplate)
        .where(NoteTemplate.org_id == ctx.org.id, scope)
        .order_by(NoteTemplate.name)
    )
    return list(result)


async def create_note_template(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    name: str,
    title: str,
    content: str,
    project_id: uuid.UUID | None,
) -> NoteTemplate:
    clash = await session.scalar(
        select(NoteTemplate.id).where(NoteTemplate.org_id == ctx.org.id, NoteTemplate.name == name)
    )
    if clash is not None:
        raise ConflictError("A template with this name already exists")
    template = NoteTemplate(
        org_id=ctx.org.id,
        project_id=project_id,
        name=name,
        title=title,
        content=content,
        created_by=ctx.user.id,
    )
    session.add(template)
    await session.flush()
    return template


async def save_note_as_template(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID, name: str
) -> NoteTemplate:
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == ctx.org.id))
    if note is None:
        raise NotFoundError("Page not found")
    return await create_note_template(
        session,
        ctx,
        name=name,
        title=note.title,
        content=note.content,
        project_id=note.project_id,
    )


async def delete_note_template(
    session: AsyncSession, ctx: OrgContext, template_id: uuid.UUID
) -> None:
    template = await session.scalar(
        select(NoteTemplate).where(
            NoteTemplate.id == template_id, NoteTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Template not found")
    await session.delete(template)
    await session.flush()
