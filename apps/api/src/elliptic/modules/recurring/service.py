"""Recurring work item business logic (COS-143)."""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.projects.models import Project
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.recurring.models import RecurringTaskRule
from elliptic.modules.recurring.schemas import RecurringTaskCreateIn, RecurringTaskUpdateIn
from elliptic.modules.tasks.models import Task, TaskStatus


async def _project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> Project:
    project = await session.scalar(
        select(Project).where(
            Project.id == project_id, Project.org_id == ctx.org.id, Project.deleted_at.is_(None)
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def list_rules(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[RecurringTaskRule]:
    await _project(session, ctx, project_id)
    result = await session.scalars(
        select(RecurringTaskRule)
        .where(RecurringTaskRule.project_id == project_id, RecurringTaskRule.org_id == ctx.org.id)
        .order_by(RecurringTaskRule.created_at.desc())
    )
    return list(result)


async def create_rule(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: RecurringTaskCreateIn
) -> RecurringTaskRule:
    await _project(session, ctx, project_id)
    rule = RecurringTaskRule(
        org_id=ctx.org.id,
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        kind=payload.kind,
        assignee_id=payload.assignee_id,
        interval_days=payload.interval_days,
        next_run_at=payload.starts_at or utcnow(),
        active=True,
    )
    session.add(rule)
    await session.flush()
    return rule


async def _get_rule(
    session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID
) -> RecurringTaskRule:
    rule = await session.scalar(
        select(RecurringTaskRule).where(
            RecurringTaskRule.id == rule_id, RecurringTaskRule.org_id == ctx.org.id
        )
    )
    if rule is None:
        raise NotFoundError("Recurring rule not found")
    return rule


async def update_rule(
    session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID, payload: RecurringTaskUpdateIn
) -> RecurringTaskRule:
    rule = await _get_rule(session, ctx, rule_id)
    if payload.title is not None:
        rule.title = payload.title
    if payload.description is not None:
        rule.description = payload.description or None
    if payload.priority is not None:
        rule.priority = payload.priority
    if payload.kind is not None:
        rule.kind = payload.kind
    if payload.assignee_id is not None:
        rule.assignee_id = payload.assignee_id
    if payload.clear_assignee:
        rule.assignee_id = None
    if payload.interval_days is not None:
        rule.interval_days = payload.interval_days
    if payload.next_run_at is not None:
        rule.next_run_at = payload.next_run_at
    if payload.active is not None:
        rule.active = payload.active
    await session.flush()
    return rule


async def delete_rule(session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID) -> None:
    rule = await _get_rule(session, ctx, rule_id)
    await session.delete(rule)
    await session.flush()


async def _materialize(session: AsyncSession, rule: RecurringTaskRule, now: datetime) -> Task:
    """Create one task from a rule and advance its next_run_at."""
    project = await session.get(Project, rule.project_id)
    if project is None:
        raise NotFoundError("Project not found")
    number = await next_task_number(session, project)
    task = Task(
        org_id=rule.org_id,
        project_id=rule.project_id,
        number=number,
        title=rule.title,
        description=rule.description,
        status=TaskStatus.TODO,
        priority=rule.priority,
        kind=rule.kind,
        assignee_id=rule.assignee_id,
        created_by=None,
        labels=[],
    )
    session.add(task)
    while rule.next_run_at <= now:
        rule.next_run_at = rule.next_run_at + timedelta(days=rule.interval_days)
    rule.last_run_at = now
    await session.flush()
    return task


async def run_rule_now(session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID) -> Task:
    rule = await _get_rule(session, ctx, rule_id)
    return await _materialize(session, rule, utcnow())


async def materialize_due(session: AsyncSession) -> int:
    """Scheduler entrypoint: materialize every active rule whose next_run_at has passed."""
    now = utcnow()
    due = list(
        await session.scalars(
            select(RecurringTaskRule).where(
                RecurringTaskRule.active.is_(True), RecurringTaskRule.next_run_at <= now
            )
        )
    )
    for rule in due:
        await _materialize(session, rule, now)
    await session.commit()
    return len(due)
