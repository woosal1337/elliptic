"""Release business logic."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.projects.models import Project
from elliptic.modules.releases.models import ChangelogCategory, ChangelogEntry, Release
from elliptic.modules.releases.schemas import ReleaseCreateIn, ReleaseUpdateIn
from elliptic.modules.tasks.models import PROGRESS_EXCLUDED_STATUSES, Task, TaskStatus


async def get_release(session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID) -> Release:
    release = await session.scalar(
        select(Release).where(Release.id == release_id, Release.org_id == ctx.org.id)
    )
    if release is None:
        raise NotFoundError("Release not found")
    return release


async def create_release(
    session: AsyncSession, ctx: OrgContext, payload: ReleaseCreateIn
) -> Release:
    """Create an org-scoped release."""
    release = Release(
        org_id=ctx.org.id,
        name=payload.name,
        version=payload.version,
        description=payload.description,
        released_at=payload.released_at,
        created_by=ctx.user.id,
    )
    session.add(release)
    await session.flush()
    return release


async def list_releases(session: AsyncSession, ctx: OrgContext) -> list[Release]:
    """List the org's releases, newest first."""
    result = await session.scalars(
        select(Release).where(Release.org_id == ctx.org.id).order_by(Release.created_at.desc())
    )
    return list(result)


async def release_counts(
    session: AsyncSession, release_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, int]]:
    """Return per-release {total, done} from tagged work items."""
    if not release_ids:
        return {}
    rows = await session.execute(
        select(
            Task.release_id,
            func.count().filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
            func.count().filter(Task.status == TaskStatus.DONE),
        )
        .where(Task.release_id.in_(release_ids))
        .group_by(Task.release_id)
    )
    return {rid: {"total": total, "done": done} for rid, total, done in rows if rid is not None}


async def update_release(
    session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID, payload: ReleaseUpdateIn
) -> Release:
    """Apply updates to a release."""
    release = await get_release(session, ctx, release_id)
    if payload.name is not None:
        release.name = payload.name
    if payload.version is not None:
        release.version = payload.version or None
    if payload.description is not None:
        release.description = payload.description or None
    if payload.changelog is not None:
        release.changelog = payload.changelog or None
    if payload.status is not None:
        release.status = payload.status
    if payload.released_at is not None:
        release.released_at = payload.released_at
    await session.flush()
    return release


async def delete_release(session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID) -> None:
    """Delete a release; tagged tasks are detached (release_id set null)."""
    release = await get_release(session, ctx, release_id)
    await session.delete(release)
    await session.flush()


async def _task_in_org(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    task = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def assign_task(
    session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Tag a task into a release."""
    release = await get_release(session, ctx, release_id)
    task = await _task_in_org(session, ctx, task_id)
    task.release_id = release.id
    await session.flush()


async def unassign_task(
    session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    """Remove a task from a release."""
    await get_release(session, ctx, release_id)
    task = await _task_in_org(session, ctx, task_id)
    if task.release_id == release_id:
        task.release_id = None
        await session.flush()


async def list_release_tasks(
    session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID
) -> list[tuple[Task, str]]:
    """List the work items tagged into a release with their project keys."""
    await get_release(session, ctx, release_id)
    rows = await session.execute(
        select(Task, Project.key)
        .join(Project, Project.id == Task.project_id)
        .where(Task.release_id == release_id, Task.org_id == ctx.org.id)
        .order_by(Task.status, Task.created_at.desc())
    )
    return [(task, key) for task, key in rows]


async def list_changelog(
    session: AsyncSession, ctx: OrgContext, release_id: uuid.UUID
) -> list[ChangelogEntry]:
    """List a release's changelog entries, grouped-friendly (category, then sort_order)."""
    await get_release(session, ctx, release_id)
    result = await session.scalars(
        select(ChangelogEntry)
        .where(ChangelogEntry.release_id == release_id, ChangelogEntry.org_id == ctx.org.id)
        .order_by(ChangelogEntry.category, ChangelogEntry.sort_order, ChangelogEntry.created_at)
    )
    return list(result)


async def create_changelog_entry(
    session: AsyncSession,
    ctx: OrgContext,
    release_id: uuid.UUID,
    *,
    category: ChangelogCategory,
    title: str,
    body: str | None,
    pr_url: str | None,
) -> ChangelogEntry:
    await get_release(session, ctx, release_id)
    entry = ChangelogEntry(
        org_id=ctx.org.id,
        release_id=release_id,
        category=category,
        title=title,
        body=body,
        pr_url=pr_url,
    )
    session.add(entry)
    await session.flush()
    return entry


async def _get_entry(session: AsyncSession, ctx: OrgContext, entry_id: uuid.UUID) -> ChangelogEntry:
    entry = await session.scalar(
        select(ChangelogEntry).where(
            ChangelogEntry.id == entry_id, ChangelogEntry.org_id == ctx.org.id
        )
    )
    if entry is None:
        raise NotFoundError("Changelog entry not found")
    return entry


async def update_changelog_entry(
    session: AsyncSession,
    ctx: OrgContext,
    entry_id: uuid.UUID,
    *,
    category: ChangelogCategory | None,
    title: str | None,
    body: str | None,
    pr_url: str | None,
) -> ChangelogEntry:
    entry = await _get_entry(session, ctx, entry_id)
    if category is not None:
        entry.category = category
    if title is not None:
        entry.title = title
    if body is not None:
        entry.body = body or None
    if pr_url is not None:
        entry.pr_url = pr_url or None
    await session.flush()
    return entry


async def delete_changelog_entry(
    session: AsyncSession, ctx: OrgContext, entry_id: uuid.UUID
) -> None:
    entry = await _get_entry(session, ctx, entry_id)
    await session.delete(entry)
    await session.flush()
