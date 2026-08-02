"""Scheduled maintenance jobs: notification retention, email dispatch, recovery."""

from datetime import timedelta
from typing import Any, cast

from sqlalchemy import CursorResult, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.email import EmailSender, deliver_email
from elliptic.core.models_base import utcnow
from elliptic.modules.notifications.models import Notification
from elliptic.modules.projects.models import Project
from elliptic.modules.sync import service as sync_service
from elliptic.modules.tasks.models import Task, TaskStatus
from elliptic.modules.users.models import User

NOTIFICATION_RETENTION = 100
EMAIL_DELAY_SECONDS = 0
STALE_TASK_DAYS = 30
PROJECT_PURGE_DAYS = 30
_CLOSED_STATUSES = (TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.DUPLICATE)


async def prune_notifications(session: AsyncSession, *, keep: int = NOTIFICATION_RETENTION) -> int:
    """Keep at most ``keep`` notifications per recipient, deleting the oldest (TRI-02-PRUNE)."""
    over = (
        await session.execute(
            select(Notification.recipient_id)
            .group_by(Notification.recipient_id)
            .having(func.count() > keep)
        )
    ).all()
    deleted = 0
    for (recipient_id,) in over:
        keep_ids = list(
            await session.scalars(
                select(Notification.id)
                .where(Notification.recipient_id == recipient_id)
                .order_by(Notification.created_at.desc(), Notification.id.desc())
                .limit(keep)
            )
        )
        result = await session.execute(
            delete(Notification).where(
                Notification.recipient_id == recipient_id,
                Notification.id.notin_(keep_ids),
            )
        )
        deleted += cast("CursorResult[Any]", result).rowcount or 0
    await session.commit()
    return deleted


async def dispatch_pending_emails(
    session: AsyncSession,
    *,
    delay_seconds: int = EMAIL_DELAY_SECONDS,
    sender: EmailSender = deliver_email,
) -> int:
    """Email notifications still unread after a delay, once each (TRI-02-EMAIL).

    A notification read before this runs is skipped, so users never get both an
    in-app notification and an email for the same event.
    """
    cutoff = utcnow() - timedelta(seconds=delay_seconds)
    pending = list(
        await session.scalars(
            select(Notification).where(
                Notification.read_at.is_(None),
                Notification.archived_at.is_(None),
                Notification.email_sent_at.is_(None),
                Notification.created_at <= cutoff,
            )
        )
    )
    sent = 0
    for notification in pending:
        user = await session.get(User, notification.recipient_id)
        if user is None:
            continue
        sender(user.email, notification.title, notification.snippet or "")
        notification.email_sent_at = utcnow()
        sent += 1
    await session.commit()
    return sent


async def archive_stale_tasks(
    session: AsyncSession, *, inactive_days: int = STALE_TASK_DAYS
) -> int:
    """Archive open tasks untouched beyond the inactivity threshold (SAFE-06)."""
    cutoff = utcnow() - timedelta(days=inactive_days)
    result = await session.execute(
        update(Task)
        .where(
            Task.archived_at.is_(None),
            Task.updated_at < cutoff,
            Task.status.notin_(_CLOSED_STATUSES),
        )
        .values(archived_at=utcnow())
    )
    await session.commit()
    return cast("CursorResult[Any]", result).rowcount or 0


async def purge_deleted_projects(
    session: AsyncSession, *, retention_days: int = PROJECT_PURGE_DAYS
) -> int:
    """Permanently delete projects soft-deleted longer than the retention window (SAFE-06)."""
    cutoff = utcnow() - timedelta(days=retention_days)
    projects = list(
        await session.scalars(
            select(Project).where(Project.deleted_at.is_not(None), Project.deleted_at < cutoff)
        )
    )
    for project in projects:
        await session.delete(project)
    await session.commit()
    return len(projects)


async def apply_project_lifecycle(session: AsyncSession) -> int:
    """Apply each project's lifecycle housekeeping presets (COS-218).

    Per project with timers configured: auto-archive completed/cancelled items
    idle past ``auto_archive_days`` (skipping items in an active cycle/module),
    and auto-close items idle past ``auto_close_days`` into the target status.
    Returns the number of work items affected.
    """
    now = utcnow()
    affected = 0
    projects = await session.scalars(
        select(Project).where(
            Project.deleted_at.is_(None),
            or_(Project.auto_archive_days.is_not(None), Project.auto_close_days.is_not(None)),
        )
    )
    for project in projects:
        if project.auto_archive_days is not None:
            cutoff = now - timedelta(days=project.auto_archive_days)
            archived = await session.execute(
                update(Task)
                .where(
                    Task.project_id == project.id,
                    Task.archived_at.is_(None),
                    Task.status.in_(_CLOSED_STATUSES),
                    Task.updated_at < cutoff,
                    Task.cycle_id.is_(None),
                    Task.module_id.is_(None),
                )
                .values(archived_at=now)
            )
            affected += cast("CursorResult[Any]", archived).rowcount or 0
        if project.auto_close_days is not None and project.auto_close_status is not None:
            try:
                target = TaskStatus(project.auto_close_status)
            except ValueError:
                continue
            cutoff = now - timedelta(days=project.auto_close_days)
            closed = await session.execute(
                update(Task)
                .where(
                    Task.project_id == project.id,
                    Task.archived_at.is_(None),
                    Task.status.notin_(_CLOSED_STATUSES),
                    Task.updated_at < cutoff,
                )
                .values(status=target)
            )
            affected += cast("CursorResult[Any]", closed).rowcount or 0
    await session.commit()
    return affected


async def materialize_recurring_tasks(session: AsyncSession) -> int:
    """Materialize due recurring work item rules into tasks (COS-143)."""
    from elliptic.modules.recurring.service import materialize_due  # noqa: PLC0415

    return await materialize_due(session)


async def drain_outbox(session: AsyncSession) -> int:
    """Auto-dispatch due outbox events for every org with a backlog (COS-274)."""
    from elliptic.modules.outbox import service as outbox_service  # noqa: PLC0415

    org_ids = await outbox_service.orgs_with_due_events(session)
    total = 0
    for org_id in org_ids:
        total += await outbox_service.dispatch_pending(session, org_id)
        await session.commit()
    return total


async def purge_sync_tombstones(session: AsyncSession, *, retention_days: int = 30) -> int:
    """Drop delta-sync tombstones past the retention window.

    A tombstone exists only so a client learns to forget a row. Past the window
    any client still holding it is long overdue a full bootstrap, so the record
    has no reader left and would otherwise grow the table forever.
    """
    return await sync_service.purge_tombstones(session, retention_days=retention_days)
