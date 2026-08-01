"""Comment business logic with target entity verification."""

import uuid

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ForbiddenError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.service import record_activity
from elliptic.modules.comments.models import (
    Comment,
    CommentEntityType,
    CommentReaction,
    CommentVersion,
    CommentVisibility,
)
from elliptic.modules.comments.schemas import (
    CommentCreateIn,
    CommentUpdateIn,
    ReactionSummary,
)
from elliptic.modules.meetings.models import Meeting
from elliptic.modules.notes.models import Note
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from elliptic.modules.orgs.models import ROLE_ORDER, OrganizationMember, OrgRole
from elliptic.modules.tasks.models import Task, TaskSubscription

_ENTITY_MODELS: dict[CommentEntityType, type[Task | Meeting | Note]] = {
    CommentEntityType.TASK: Task,
    CommentEntityType.MEETING: Meeting,
    CommentEntityType.NOTE: Note,
}


async def _verify_entity(
    session: AsyncSession, ctx: OrgContext, entity_type: CommentEntityType, entity_id: uuid.UUID
) -> None:
    model = _ENTITY_MODELS[entity_type]
    row = await session.scalar(
        select(model.id).where(model.id == entity_id, model.org_id == ctx.org.id)
    )
    if row is None:
        raise NotFoundError(f"{entity_type.capitalize()} not found")


async def _verify_parent(session: AsyncSession, ctx: OrgContext, payload: CommentCreateIn) -> None:
    if payload.parent_id is None:
        return
    parent = await session.scalar(
        select(Comment).where(Comment.id == payload.parent_id, Comment.org_id == ctx.org.id)
    )
    if parent is None:
        raise NotFoundError("Parent comment not found")
    if parent.entity_type != payload.entity_type or parent.entity_id != payload.entity_id:
        raise ForbiddenError("Parent comment belongs to a different entity")
    if parent.parent_id is not None:
        raise ForbiddenError("Comments can only be nested one level deep")


async def create_comment(
    session: AsyncSession, ctx: OrgContext, payload: CommentCreateIn
) -> Comment:
    """Create a comment after verifying the target belongs to the org."""
    await _verify_entity(session, ctx, payload.entity_type, payload.entity_id)
    await _verify_parent(session, ctx, payload)
    comment = Comment(
        org_id=ctx.org.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        author_id=ctx.user.id,
        content=payload.content,
        parent_id=payload.parent_id,
        visibility=payload.visibility,
        anchor=payload.anchor,
    )
    session.add(comment)
    await session.flush()
    if payload.attachment_ids:
        from elliptic.modules.storage import service as storage_service  # noqa: PLC0415
        from elliptic.modules.storage.models import StoredObjectEntity  # noqa: PLC0415

        await storage_service.bind_objects(
            session, ctx, payload.attachment_ids, StoredObjectEntity.COMMENT, comment.id
        )
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        event_type="commented",
        actor_id=ctx.user.id,
        payload={"comment_id": str(comment.id)},
    )
    await _process_mentions(session, ctx, comment, payload.mention_user_ids)
    await _emit_commented(session, ctx, comment)
    return comment


async def _auto_subscribe_task(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Idempotently subscribe a user to a task; never raises into the caller."""
    try:
        exists = await session.scalar(
            select(TaskSubscription.id).where(
                TaskSubscription.task_id == task_id, TaskSubscription.user_id == user_id
            )
        )
        if exists is not None:
            return
        session.add(TaskSubscription(org_id=ctx.org.id, task_id=task_id, user_id=user_id))
        await session.flush()
    except Exception:
        logger.exception("Failed to auto-subscribe user {} to task {}", user_id, task_id)


async def _process_mentions(
    session: AsyncSession, ctx: OrgContext, comment: Comment, user_ids: list[uuid.UUID]
) -> None:
    """Notify mentioned org members and auto-subscribe them to a mentioned task."""
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
        if comment.entity_type == CommentEntityType.TASK:
            await _auto_subscribe_task(session, ctx, comment.entity_id, user_id)
        try:
            await notify(
                session,
                org_id=ctx.org.id,
                recipient_id=user_id,
                type=NotificationType.MENTIONED,
                entity_type=comment.entity_type,
                entity_id=comment.entity_id,
                actor_id=ctx.user.id,
                title=f"You were mentioned in a {comment.entity_type} comment",
                snippet=comment.content[:280],
            )
        except Exception:
            logger.exception("Failed to emit mention notification for comment {}", comment.id)


async def _entity_recipient(
    session: AsyncSession, ctx: OrgContext, entity_type: CommentEntityType, entity_id: uuid.UUID
) -> uuid.UUID | None:
    if entity_type == CommentEntityType.TASK:
        return await session.scalar(
            select(Task.assignee_id).where(Task.id == entity_id, Task.org_id == ctx.org.id)
        )
    if entity_type == CommentEntityType.MEETING:
        meeting_owner: uuid.UUID | None = await session.scalar(
            select(Meeting.created_by).where(Meeting.id == entity_id, Meeting.org_id == ctx.org.id)
        )
        return meeting_owner
    note_owner: uuid.UUID | None = await session.scalar(
        select(Note.created_by).where(Note.id == entity_id, Note.org_id == ctx.org.id)
    )
    return note_owner


async def _emit_commented(session: AsyncSession, ctx: OrgContext, comment: Comment) -> None:
    try:
        recipient_id = await _entity_recipient(session, ctx, comment.entity_type, comment.entity_id)
        if recipient_id is None:
            return
        await notify(
            session,
            org_id=ctx.org.id,
            recipient_id=recipient_id,
            type=NotificationType.COMMENTED,
            entity_type=comment.entity_type,
            entity_id=comment.entity_id,
            actor_id=ctx.user.id,
            title=f"New comment on your {comment.entity_type}",
            snippet=comment.content[:280],
        )
    except Exception:
        logger.exception("Failed to emit commented notification for comment {}", comment.id)


async def list_comments(
    session: AsyncSession,
    ctx: OrgContext,
    page: PageParams,
    *,
    entity_type: CommentEntityType | None = None,
    entity_id: uuid.UUID | None = None,
) -> tuple[list[Comment], int]:
    """List comments with optional entity filters."""
    query = select(Comment).where(Comment.org_id == ctx.org.id)
    if entity_type is not None:
        query = query.where(Comment.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(Comment.entity_id == entity_id)
    if ctx.role is OrgRole.GUEST:
        query = query.where(Comment.visibility == CommentVisibility.EXTERNAL)
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    result = await session.scalars(
        query.order_by(Comment.created_at).limit(page.limit).offset(page.offset)
    )
    return list(result), total


async def get_comment(session: AsyncSession, ctx: OrgContext, comment_id: uuid.UUID) -> Comment:
    """Fetch a comment within the org or 404."""
    comment = await session.scalar(
        select(Comment).where(Comment.id == comment_id, Comment.org_id == ctx.org.id)
    )
    if comment is None:
        raise NotFoundError("Comment not found")
    return comment


def _check_author_or_admin(ctx: OrgContext, comment: Comment) -> None:
    if comment.author_id != ctx.user.id and ROLE_ORDER[ctx.role] < ROLE_ORDER[OrgRole.ADMIN]:
        raise ForbiddenError("Only the author or an admin can modify this comment")


async def update_comment(
    session: AsyncSession, ctx: OrgContext, comment_id: uuid.UUID, payload: CommentUpdateIn
) -> Comment:
    """Edit a comment as its author or an admin, snapshotting the prior content."""
    comment = await get_comment(session, ctx, comment_id)
    _check_author_or_admin(ctx, comment)
    if payload.content != comment.content:
        session.add(
            CommentVersion(
                org_id=ctx.org.id,
                comment_id=comment.id,
                content=comment.content,
                edited_by=ctx.user.id,
            )
        )
        comment.edited_at = utcnow()
    comment.content = payload.content
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        event_type="comment_updated",
        actor_id=ctx.user.id,
        payload={"comment_id": str(comment.id)},
    )
    await session.flush()
    return comment


async def resolve_comment(
    session: AsyncSession, ctx: OrgContext, comment_id: uuid.UUID, resolved: bool
) -> Comment:
    """Mark a comment resolved or unresolved (author or admin)."""
    comment = await get_comment(session, ctx, comment_id)
    _check_author_or_admin(ctx, comment)
    comment.resolved_at = utcnow() if resolved else None
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        event_type="comment_resolved" if resolved else "comment_unresolved",
        actor_id=ctx.user.id,
        payload={"comment_id": str(comment.id)},
    )
    await session.flush()
    return comment


async def reactions_for(
    session: AsyncSession, ctx: OrgContext, comment_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[ReactionSummary]]:
    """Aggregate reactions per comment (emoji → count + whether the caller reacted)."""
    if not comment_ids:
        return {}
    rows = await session.scalars(
        select(CommentReaction).where(
            CommentReaction.comment_id.in_(comment_ids),
            CommentReaction.org_id == ctx.org.id,
        )
    )
    grouped: dict[uuid.UUID, dict[str, ReactionSummary]] = {}
    for reaction in rows:
        per_emoji = grouped.setdefault(reaction.comment_id, {})
        summary = per_emoji.get(reaction.emoji)
        if summary is None:
            summary = ReactionSummary(emoji=reaction.emoji, count=0, reacted=False)
            per_emoji[reaction.emoji] = summary
        summary.count += 1
        if reaction.user_id == ctx.user.id:
            summary.reacted = True
    return {comment_id: list(per_emoji.values()) for comment_id, per_emoji in grouped.items()}


async def toggle_reaction(
    session: AsyncSession, ctx: OrgContext, comment_id: uuid.UUID, emoji: str
) -> list[ReactionSummary]:
    """Add or remove the caller's emoji reaction on a comment."""
    comment = await get_comment(session, ctx, comment_id)
    existing = await session.scalar(
        select(CommentReaction).where(
            CommentReaction.comment_id == comment.id,
            CommentReaction.user_id == ctx.user.id,
            CommentReaction.emoji == emoji,
        )
    )
    if existing is not None:
        await session.delete(existing)
    else:
        session.add(
            CommentReaction(
                org_id=ctx.org.id,
                comment_id=comment.id,
                user_id=ctx.user.id,
                emoji=emoji,
            )
        )
    await session.flush()
    summaries = await reactions_for(session, ctx, [comment.id])
    return summaries.get(comment.id, [])


async def delete_comment(session: AsyncSession, ctx: OrgContext, comment_id: uuid.UUID) -> None:
    """Delete a comment as its author or an admin (subject to the role matrix)."""
    comment = await get_comment(session, ctx, comment_id)
    _check_author_or_admin(ctx, comment)
    from elliptic.core.exceptions import ForbiddenError  # noqa: PLC0415
    from elliptic.modules.orgs.roles_service import evaluate_cell  # noqa: PLC0415

    if not await evaluate_cell(session, ctx, "comments", "delete", owner_id=comment.author_id):
        raise ForbiddenError("Your role does not permit deleting comments")
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        event_type="comment_deleted",
        actor_id=ctx.user.id,
        payload={"comment_id": str(comment.id)},
    )
    await session.delete(comment)
    await session.flush()


async def list_comment_versions(
    session: AsyncSession, ctx: OrgContext, comment_id: uuid.UUID
) -> list[CommentVersion]:
    """List a comment's prior-content snapshots, newest first."""
    await get_comment(session, ctx, comment_id)
    result = await session.scalars(
        select(CommentVersion)
        .where(CommentVersion.comment_id == comment_id, CommentVersion.org_id == ctx.org.id)
        .order_by(CommentVersion.created_at.desc())
    )
    return list(result)
