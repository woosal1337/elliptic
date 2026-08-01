"""Note business logic."""

import uuid
from datetime import UTC, datetime

from loguru import logger
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.service import record_activity
from elliptic.modules.notes.models import (
    Note,
    NoteShare,
    NoteShareAccess,
    NoteVersion,
    NoteVisibility,
)
from elliptic.modules.notes.schemas import NoteCreateIn, NoteUpdateIn
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from elliptic.modules.orgs.models import ROLE_ORDER, OrganizationMember, OrgRole
from elliptic.modules.projects.models import Project

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


def _is_admin(ctx: OrgContext) -> bool:
    return ROLE_ORDER[ctx.role] >= ROLE_ORDER[OrgRole.ADMIN]


async def _note_share_access(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID
) -> NoteShareAccess | None:
    """The caller's explicit per-member share access on a page, if any."""
    access: NoteShareAccess | None = await session.scalar(
        select(NoteShare.access).where(
            NoteShare.note_id == note_id,
            NoteShare.user_id == ctx.user.id,
            NoteShare.org_id == ctx.org.id,
        )
    )
    return access


async def _assert_can_view(session: AsyncSession, ctx: OrgContext, note: Note) -> None:
    """A public page is visible to the org; private/shared only to creator, an
    explicitly-shared member, or an org admin."""
    if note.visibility is NoteVisibility.PUBLIC:
        return
    if note.created_by == ctx.user.id or _is_admin(ctx):
        return
    if await _note_share_access(session, ctx, note.id) is not None:
        return
    raise NotFoundError("Note not found")


async def get_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> Note:
    """Fetch a note the caller may view within the org, or 404."""
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == ctx.org.id))
    if note is None:
        raise NotFoundError("Note not found")
    await _assert_can_view(session, ctx, note)
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
    include_archived: bool = False,
) -> tuple[list[Note], int]:
    """List notes the caller may see, with optional project filter and text search."""
    query = select(Note).where(Note.org_id == ctx.org.id)
    if not include_archived:
        query = query.where(Note.archived_at.is_(None))
    if not _is_admin(ctx):
        shared_ids = select(NoteShare.note_id).where(
            NoteShare.user_id == ctx.user.id, NoteShare.org_id == ctx.org.id
        )
        query = query.where(
            or_(
                Note.visibility == NoteVisibility.PUBLIC,
                Note.created_by == ctx.user.id,
                Note.id.in_(shared_ids),
            )
        )
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
    if note.locked:
        raise ForbiddenError("This page is locked")
    if (
        note.visibility is not NoteVisibility.PUBLIC
        and note.created_by != ctx.user.id
        and not _is_admin(ctx)
        and await _note_share_access(session, ctx, note.id) is not NoteShareAccess.EDIT
    ):
        raise ForbiddenError("You don't have edit access to this page")
    if payload.project_id is not None:
        await _validate_project(session, ctx, payload.project_id)
        note.project_id = payload.project_id
    if payload.parent_id is not None:
        await _validate_parent(session, ctx, payload.parent_id, note.id)
        note.parent_id = payload.parent_id
    title_changed = payload.title is not None and payload.title != note.title
    content_changed = payload.content is not None and payload.content != note.content
    if title_changed or content_changed:
        session.add(
            NoteVersion(
                org_id=ctx.org.id,
                note_id=note.id,
                title=note.title,
                content=note.content,
                edited_by=ctx.user.id,
            )
        )
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


async def duplicate_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> Note:
    """Create a copy of a note (same project/parent/icon/content), titled '… (copy)'."""
    source = await get_note(session, ctx, note_id)
    copy = Note(
        org_id=ctx.org.id,
        project_id=source.project_id,
        parent_id=source.parent_id,
        title=f"{source.title} (copy)"[:500],
        content=source.content,
        icon=source.icon,
        created_by=ctx.user.id,
        updated_by=ctx.user.id,
    )
    session.add(copy)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="note",
        entity_id=copy.id,
        event_type="created",
        actor_id=ctx.user.id,
        project_id=copy.project_id,
        payload={"title": copy.title, "excerpt": _excerpt(copy.content)},
    )
    return copy


async def delete_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> None:
    """Delete a note."""
    note = await get_note(session, ctx, note_id)
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


async def list_note_versions(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID
) -> list[NoteVersion]:
    """List a page's prior versions, newest first."""
    await get_note(session, ctx, note_id)
    result = await session.scalars(
        select(NoteVersion)
        .where(NoteVersion.note_id == note_id, NoteVersion.org_id == ctx.org.id)
        .order_by(NoteVersion.created_at.desc(), NoteVersion.id.desc())
    )
    return list(result)


async def restore_note_version(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID, version_id: uuid.UUID
) -> Note:
    """Non-destructively restore a prior version.

    The current state is first snapshotted as a new version, then the chosen
    version's title+content is applied — so a restore is itself reversible.
    """
    note = await get_note(session, ctx, note_id)
    version = await session.scalar(
        select(NoteVersion).where(
            NoteVersion.id == version_id,
            NoteVersion.note_id == note_id,
            NoteVersion.org_id == ctx.org.id,
        )
    )
    if version is None:
        raise NotFoundError("Version not found")
    session.add(
        NoteVersion(
            org_id=ctx.org.id,
            note_id=note.id,
            title=note.title,
            content=note.content,
            edited_by=ctx.user.id,
        )
    )
    note.title = version.title
    note.content = version.content
    note.updated_by = ctx.user.id
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="note",
        entity_id=note.id,
        event_type="version_restored",
        actor_id=ctx.user.id,
        project_id=note.project_id,
        payload={"title": note.title},
    )
    await session.flush()
    return note


def _require_note_manager(ctx: OrgContext, note: Note) -> None:
    """Lifecycle + sharing changes are limited to the creator or an org admin."""
    if note.created_by != ctx.user.id and not _is_admin(ctx):
        raise ForbiddenError("Only the page owner or an admin can change this")


async def set_note_lifecycle(
    session: AsyncSession,
    ctx: OrgContext,
    note_id: uuid.UUID,
    *,
    visibility: NoteVisibility | None = None,
    locked: bool | None = None,
    archived: bool | None = None,
) -> Note:
    """Change a page's visibility, lock state, and/or archive state (owner/admin)."""
    note = await get_note(session, ctx, note_id)
    _require_note_manager(ctx, note)
    if visibility is not None:
        note.visibility = visibility
    if locked is not None:
        note.locked = locked
    if archived is not None:
        note.archived_at = datetime.now(UTC) if archived else None
    note.updated_by = ctx.user.id
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="note",
        entity_id=note.id,
        event_type="lifecycle_changed",
        actor_id=ctx.user.id,
        project_id=note.project_id,
        payload={
            "visibility": note.visibility.value,
            "locked": note.locked,
            "archived": note.archived_at is not None,
        },
    )
    await session.flush()
    return note


async def list_note_shares(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID
) -> list[NoteShare]:
    """List a page's per-member shares."""
    await get_note(session, ctx, note_id)
    result = await session.scalars(
        select(NoteShare).where(NoteShare.note_id == note_id, NoteShare.org_id == ctx.org.id)
    )
    return list(result)


async def share_note(
    session: AsyncSession,
    ctx: OrgContext,
    note_id: uuid.UUID,
    user_id: uuid.UUID,
    access: NoteShareAccess,
) -> NoteShare:
    """Grant (or update) a member's access to a page (owner/admin)."""
    note = await get_note(session, ctx, note_id)
    _require_note_manager(ctx, note)
    member = await session.scalar(
        select(OrganizationMember.id).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise BadRequestError("User is not a member of this organization")
    share = await session.scalar(
        select(NoteShare).where(
            NoteShare.note_id == note_id,
            NoteShare.user_id == user_id,
            NoteShare.org_id == ctx.org.id,
        )
    )
    if share is None:
        share = NoteShare(org_id=ctx.org.id, note_id=note_id, user_id=user_id, access=access)
        session.add(share)
    else:
        share.access = access
    await session.flush()
    return share


async def unshare_note(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Revoke a member's access to a page (owner/admin)."""
    note = await get_note(session, ctx, note_id)
    _require_note_manager(ctx, note)
    share = await session.scalar(
        select(NoteShare).where(
            NoteShare.note_id == note_id,
            NoteShare.user_id == user_id,
            NoteShare.org_id == ctx.org.id,
        )
    )
    if share is not None:
        await session.delete(share)
        await session.flush()
