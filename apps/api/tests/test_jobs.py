"""Scheduled maintenance jobs: retention, email gating, recovery (TRI-02-*, SAFE-06)."""

import uuid
from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy import func, select, update

from elliptic.core.database import session_factory
from elliptic.core.jobs import (
    archive_stale_tasks,
    prune_notifications,
    purge_deleted_projects,
)
from elliptic.core.models_base import utcnow
from elliptic.modules.notifications.models import Notification, NotificationType
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task
from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def test_prune_keeps_newest_per_recipient(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    recipient = uuid.UUID(auth["user_id"])
    async with session_factory() as session:
        for index in range(5):
            session.add(
                Notification(
                    org_id=uuid.UUID(org["id"]),
                    recipient_id=recipient,
                    type=NotificationType.COMMENTED,
                    entity_type="task",
                    entity_id=None,
                    actor_id=None,
                    title=f"note {index}",
                )
            )
        await session.commit()
        deleted = await prune_notifications(session, keep=2)
        assert deleted == 3
        remaining = await session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.recipient_id == recipient)
        )
        assert remaining == 2


async def test_archive_stale_tasks(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="STL")
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    async with session_factory() as session:
        await session.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task["id"]))
            .values(updated_at=utcnow() - timedelta(days=60))
        )
        await session.commit()
        archived = await archive_stale_tasks(session, inactive_days=30)
        assert archived == 1
        row = await session.get(Task, uuid.UUID(task["id"]))
        assert row is not None
        assert row.archived_at is not None


async def test_purge_old_soft_deleted_projects(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="PRG")
    await client.delete(f"{API}/orgs/{org['id']}/projects/{project['id']}", headers=auth["headers"])
    async with session_factory() as session:
        await session.execute(
            update(Project)
            .where(Project.id == uuid.UUID(project["id"]))
            .values(deleted_at=utcnow() - timedelta(days=45))
        )
        await session.commit()
        purged = await purge_deleted_projects(session, retention_days=30)
        assert purged == 1
        assert await session.get(Project, uuid.UUID(project["id"])) is None
