"""Lightweight asyncio scheduler running maintenance jobs on fixed intervals."""

import asyncio
import contextlib
from collections.abc import Awaitable, Callable

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core import jobs
from elliptic.core.database import session_factory

JobRunner = Callable[[AsyncSession], Awaitable[int]]
_DAY = 86_400

_tasks: list[asyncio.Task[None]] = []


async def _dispatch_emails(session: AsyncSession) -> int:
    return await jobs.dispatch_pending_emails(session, delay_seconds=300)


_SCHEDULE: tuple[tuple[str, int, JobRunner], ...] = (
    ("prune_notifications", _DAY, jobs.prune_notifications),
    ("dispatch_pending_emails", 300, _dispatch_emails),
    ("archive_stale_tasks", _DAY, jobs.archive_stale_tasks),
    ("purge_deleted_projects", _DAY, jobs.purge_deleted_projects),
    ("purge_sync_tombstones", _DAY, jobs.purge_sync_tombstones),
    ("apply_project_lifecycle", _DAY, jobs.apply_project_lifecycle),
    ("materialize_recurring_tasks", 3_600, jobs.materialize_recurring_tasks),
    ("drain_outbox", 60, jobs.drain_outbox),
)


async def _run_periodically(name: str, interval_seconds: int, run: JobRunner) -> None:
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            async with session_factory() as session:
                await run(session)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Scheduled job {} failed", name)


def start_scheduler() -> None:
    """Spawn a background task per scheduled job."""
    for name, interval, run in _SCHEDULE:
        _tasks.append(asyncio.create_task(_run_periodically(name, interval, run)))
    logger.info("Started {} scheduled maintenance jobs", len(_tasks))


async def stop_scheduler() -> None:
    """Cancel and await all scheduled jobs."""
    for task in _tasks:
        task.cancel()
    for task in _tasks:
        with contextlib.suppress(asyncio.CancelledError):
            await task
    _tasks.clear()
