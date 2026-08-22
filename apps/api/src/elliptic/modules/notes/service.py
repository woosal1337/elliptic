"""Note business logic."""

import uuid

from loguru import logger
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.service import record_activity
from elliptic.modules.notes.models import Note
from elliptic.modules.notes.schemas import NoteCreateIn, NoteUpdateIn
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from elliptic.modules.orgs.models import OrganizationMember
from elliptic.modules.projects.models import Project
from elliptic.modules.sync import service as sync_service

_EXCERPT_CHARS = 140


def _excerpt(content: str) -> str | None:
    """First non-empty line of a note's body, trimmed for an activity card."""
    for line in content.splitlines():
        stripped = line.strip().lstrip("#").strip()
        if stripped:
            return stripped[:_EXCERPT_CHARS]
    return None


async def _notify_mentions(
    session: AsyncSession, ctx: OrgContext, note: Note, user_ids: list[uuid.UUID]
) -> None:
    """Notify mentioned org members that they were named in a note (NOTE-01)."""
    if not user_ids:
        return
    members = set(
        await session.scalars(
            select(OrganizationMember.user_id).where(
                OrganizationMember.org_id == ctx.org.id,
                OrganizationMember.user_id.in_(user_ids),
            )
        )
    )
    for user_id in members:
        if user_id == ctx.user.id:
            continue
        try:
            await notify(
                session,
                org_id=ctx.org.id,
                recipient_id=user_id,
                type=NotificationType.MENTIONED,
                entity_type="note",
                entity_id=note.id,
                actor_id=ctx.user.id,
                title=f"You were mentioned in {note.title}",
                snippet=None,
            )
        except Exception:
            logger.exception("Failed to emit note mention notification for note {}", note.id)


async def get_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> Note:
    """Fetch a note within the org, or 404. Every member sees every note."""
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == ctx.org.id))
    if note is None:
        raise NotFoundError("Note not found")
    return note


async def _validate_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise BadRequestError("Project not found in this organization")


async def _validate_parent(
    session: AsyncSession, ctx: OrgContext, parent_id: uuid.UUID, note_id: uuid.UUID | None = None
) -> None:
    if note_id is not None and parent_id == note_id:
        raise BadRequestError("A page cannot be its own parent")
    parent = await session.scalar(
        select(Note.id).where(Note.id == parent_id, Note.org_id == ctx.org.id)
    )
    if parent is None:
        raise NotFoundError("Parent page not found")


async def create_note(session: AsyncSession, ctx: OrgContext, payload: NoteCreateIn) -> Note:
    """Create a note in the organization."""
    if payload.project_id is not None:
        await _validate_project(session, ctx, payload.project_id)
    if payload.parent_id is not None:
        await _validate_parent(session, ctx, payload.parent_id)
    note = Note(
        org_id=ctx.org.id,
        project_id=payload.project_id,
        team_id=payload.team_id,
        parent_id=payload.parent_id,
        is_folder=payload.is_folder,
        title=payload.title,
        content=payload.content,
        icon=payload.icon,
        created_by=ctx.user.id,
        updated_by=ctx.user.id,
    )
    session.add(note)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="note",
        entity_id=note.id,
        event_type="created",
        actor_id=ctx.user.id,
        project_id=note.project_id,
        payload={"title": note.title, "excerpt": _excerpt(note.content)},
    )
    await _notify_mentions(session, ctx, note, payload.mention_user_ids)
    return note


async def list_notes(
    session: AsyncSession,
    ctx: OrgContext,
    page: PageParams,
    *,
    project_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    search: str | None = None,
) -> tuple[list[Note], int]:
    """List the org's notes, with optional project filter and text search."""
    query = select(Note).where(Note.org_id == ctx.org.id)
    if project_id is not None:
        query = query.where(Note.project_id == project_id)
    if team_id is not None:
        query = query.where(Note.team_id == team_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Note.title.ilike(pattern), Note.content.ilike(pattern)))
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    result = await session.scalars(
        query.order_by(Note.updated_at.desc()).limit(page.limit).offset(page.offset)
    )
    return list(result), total


async def update_note(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID, payload: NoteUpdateIn
) -> Note:
    """Apply updates to a note."""
    note = await get_note(session, ctx, note_id)
    if payload.project_id is not None:
        await _validate_project(session, ctx, payload.project_id)
        note.project_id = payload.project_id
    # "parent_id": null has to mean move to the root, not leave it alone, or a
    # note can be filed into a folder and never taken back out. Presence in the
    # payload is the only thing that separates the two, since both arrive as None.
    if "parent_id" in payload.model_fields_set:
        if payload.parent_id is not None:
            await _validate_parent(session, ctx, payload.parent_id, note.id)
        note.parent_id = payload.parent_id
    if payload.is_folder is not None:
        # Turning a folder back into a document would strand whatever is filed
        # under it: the children keep pointing at a parent nothing can be opened
        # into. Emptying it first is the caller's decision to make, not ours.
        if note.is_folder and not payload.is_folder:
            child = await session.scalar(select(Note.id).where(Note.parent_id == note.id))
            if child is not None:
                raise BadRequestError("Move or delete what is inside this folder first")
        note.is_folder = payload.is_folder
    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.icon is not None:
        note.icon = payload.icon or None
    note.updated_by = ctx.user.id
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="note",
        entity_id=note.id,
        event_type="updated",
        actor_id=ctx.user.id,
        project_id=note.project_id,
        payload={"title": note.title, "excerpt": _excerpt(note.content)},
    )
    await _notify_mentions(session, ctx, note, payload.mention_user_ids)
    await session.flush()
    return note


async def delete_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> None:
    """Delete a note."""
    note = await get_note(session, ctx, note_id)
    sync_service.record_deletion(session, ctx, entity_type="notes", entity_id=note.id)
    await session.delete(note)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="note",
        entity_id=note_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        project_id=note.project_id,
        payload={"title": note.title},
    )
    await session.flush()
