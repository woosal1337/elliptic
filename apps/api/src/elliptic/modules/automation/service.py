"""Automation rule business logic: validation, CRUD, execution, and skills."""

import uuid

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.automation.models import (
    AutomationActionType,
    AutomationRule,
    AutomationTrigger,
)
from elliptic.modules.automation.schemas import (
    AutomationActionIn,
    AutomationRuleIn,
    AutomationRuleUpdateIn,
)
from elliptic.modules.orgs.models import ROLE_ORDER, OrganizationMember, OrgRole
from elliptic.modules.projects.models import Project, ProjectMember
from elliptic.modules.projects.service import next_task_number
from elliptic.modules.tasks.models import Label, Task, TaskPriority

_VALID_PRIORITIES = {priority.value for priority in TaskPriority}


def _require_admin(ctx: OrgContext) -> None:
    if ROLE_ORDER[ctx.role] < ROLE_ORDER[OrgRole.ADMIN]:
        raise ForbiddenError("Requires admin role or higher")


def _as_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


async def _resolve_label(session: AsyncSession, ctx: OrgContext, value: str) -> Label | None:
    label_id = _as_uuid(value)
    if label_id is not None:
        by_id = await session.scalar(
            select(Label).where(Label.id == label_id, Label.org_id == ctx.org.id)
        )
        if by_id is not None:
            return by_id
    by_name: Label | None = await session.scalar(
        select(Label).where(Label.name == value, Label.org_id == ctx.org.id)
    )
    return by_name


async def _validate_action(
    session: AsyncSession, ctx: OrgContext, action: AutomationActionIn
) -> None:
    if action.type == AutomationActionType.LABEL:
        if await _resolve_label(session, ctx, action.value) is None:
            raise BadRequestError(f"Label '{action.value}' not found in this organization")
    elif action.type == AutomationActionType.ASSIGN:
        user_id = _as_uuid(action.value)
        member = (
            await session.scalar(
                select(OrganizationMember).where(
                    OrganizationMember.org_id == ctx.org.id,
                    OrganizationMember.user_id == user_id,
                )
            )
            if user_id is not None
            else None
        )
        if member is None:
            raise BadRequestError("Assign target is not a member of this organization")
        if member.role is OrgRole.GUEST:
            raise BadRequestError("Cannot assign work items to a guest")
    elif action.type == AutomationActionType.ROUTE:
        project_id = _as_uuid(action.value)
        project = (
            await session.scalar(
                select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
            )
            if project_id is not None
            else None
        )
        if project is None:
            raise BadRequestError("Route target project not found in this organization")
    elif action.value not in _VALID_PRIORITIES:
        raise BadRequestError(f"'{action.value}' is not a valid priority")


async def _validate_actions(
    session: AsyncSession, ctx: OrgContext, actions: list[AutomationActionIn]
) -> None:
    for action in actions:
        await _validate_action(session, ctx, action)


async def list_rules(session: AsyncSession, ctx: OrgContext) -> list[AutomationRule]:
    """List the org's automation rules."""
    result = await session.scalars(
        select(AutomationRule)
        .where(AutomationRule.org_id == ctx.org.id)
        .order_by(AutomationRule.created_at)
    )
    return list(result)


async def _get_rule(session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID) -> AutomationRule:
    rule = await session.scalar(
        select(AutomationRule).where(
            AutomationRule.id == rule_id, AutomationRule.org_id == ctx.org.id
        )
    )
    if rule is None:
        raise NotFoundError("Automation rule not found")
    return rule


def _serialize_actions(actions: list[AutomationActionIn]) -> list[dict[str, str]]:
    return [{"type": action.type, "value": action.value} for action in actions]


async def create_rule(
    session: AsyncSession, ctx: OrgContext, payload: AutomationRuleIn
) -> AutomationRule:
    """Create an automation rule after validating its actions (admin only)."""
    _require_admin(ctx)
    await _validate_actions(session, ctx, payload.actions)
    rule = AutomationRule(
        org_id=ctx.org.id,
        name=payload.name,
        trigger=payload.trigger,
        actions=_serialize_actions(payload.actions),
        is_skill=payload.is_skill,
        enabled=payload.enabled,
        created_by=ctx.user.id,
    )
    session.add(rule)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="automation",
        entity_id=rule.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": rule.name},
    )
    return rule


async def update_rule(
    session: AsyncSession,
    ctx: OrgContext,
    rule_id: uuid.UUID,
    payload: AutomationRuleUpdateIn,
) -> AutomationRule:
    """Apply provided fields to a rule, re-validating actions (admin only)."""
    _require_admin(ctx)
    rule = await _get_rule(session, ctx, rule_id)
    fields = payload.model_fields_set
    if "name" in fields and payload.name is not None:
        rule.name = payload.name
    if "trigger" in fields and payload.trigger is not None:
        rule.trigger = payload.trigger
    if "actions" in fields and payload.actions is not None:
        await _validate_actions(session, ctx, payload.actions)
        rule.actions = _serialize_actions(payload.actions)
    if "is_skill" in fields and payload.is_skill is not None:
        rule.is_skill = payload.is_skill
    if "enabled" in fields and payload.enabled is not None:
        rule.enabled = payload.enabled
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="automation",
        entity_id=rule.id,
        event_type="updated",
        actor_id=ctx.user.id,
        payload={"name": rule.name},
    )
    await session.flush()
    return rule


async def delete_rule(session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID) -> None:
    """Delete an automation rule (admin only)."""
    _require_admin(ctx)
    rule = await _get_rule(session, ctx, rule_id)
    await session.delete(rule)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="automation",
        entity_id=rule_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": rule.name},
    )
    await session.flush()


async def _route_task(session: AsyncSession, task: Task, project_id: uuid.UUID) -> None:
    if task.project_id == project_id:
        return
    project = await session.scalar(select(Project).where(Project.id == project_id))
    if project is None:
        return
    task.number = await next_task_number(session, project)
    task.project_id = project_id


async def _is_assignable(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """A user is assignable only if they are a project member and not a workspace guest."""
    is_member = await session.scalar(
        select(ProjectMember.id).where(
            ProjectMember.org_id == ctx.org.id,
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if is_member is None:
        return False
    org_role = await session.scalar(
        select(OrganizationMember.role).where(
            OrganizationMember.org_id == ctx.org.id,
            OrganizationMember.user_id == user_id,
        )
    )
    return org_role is not OrgRole.GUEST


async def _apply_action(
    session: AsyncSession, ctx: OrgContext, task: Task, action: AutomationActionIn
) -> None:
    if action.type == AutomationActionType.LABEL:
        label = await _resolve_label(session, ctx, action.value)
        if label is not None and label not in task.labels:
            task.labels.append(label)
    elif action.type == AutomationActionType.ASSIGN:
        user_id = _as_uuid(action.value)
        if user_id is not None and await _is_assignable(session, ctx, task.project_id, user_id):
            task.assignee_id = user_id
    elif action.type == AutomationActionType.SET_PRIORITY:
        if action.value in _VALID_PRIORITIES:
            task.priority = TaskPriority(action.value)
    elif action.type == AutomationActionType.ROUTE:
        project_id = _as_uuid(action.value)
        if project_id is not None:
            await _route_task(session, task, project_id)


async def _run_rule(
    session: AsyncSession, ctx: OrgContext, task: Task, rule: AutomationRule
) -> None:
    """Apply a rule's actions to a task, never raising into the caller."""
    try:
        for action_data in rule.actions:
            action = AutomationActionIn.model_validate(action_data)
            await _apply_action(session, ctx, task, action)
        await session.flush()
        await record_activity(
            session,
            org_id=ctx.org.id,
            entity_type="task",
            entity_id=task.id,
            event_type="automation_applied",
            actor_id=ctx.user.id,
            payload={"rule_id": str(rule.id), "name": rule.name},
        )
    except Exception:
        logger.exception("Automation rule {} failed on task {}", rule.id, task.id)


async def run_trigger(
    session: AsyncSession, ctx: OrgContext, task: Task, trigger: AutomationTrigger
) -> None:
    """Run all enabled non-skill rules for a trigger against a task (AUTO-BE-01)."""
    rules = await session.scalars(
        select(AutomationRule).where(
            AutomationRule.org_id == ctx.org.id,
            AutomationRule.trigger == trigger,
            AutomationRule.enabled.is_(True),
            AutomationRule.is_skill.is_(False),
        )
    )
    for rule in rules:
        await _run_rule(session, ctx, task, rule)


async def run_skill(
    session: AsyncSession, ctx: OrgContext, rule_id: uuid.UUID, task_id: uuid.UUID
) -> bool:
    """Invoke a skill against a task on demand (AUTO-BE-02)."""
    rule = await _get_rule(session, ctx, rule_id)
    if not rule.is_skill or not rule.enabled:
        raise BadRequestError("This rule is not an enabled skill")
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.labels))
        .where(Task.id == task_id, Task.org_id == ctx.org.id)
    )
    if task is None:
        raise NotFoundError("Task not found")
    await _run_rule(session, ctx, task, rule)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="automation",
        entity_id=rule.id,
        event_type="skill_executed",
        actor_id=ctx.user.id,
        payload={"task_id": str(task_id)},
    )
    await session.flush()
    return True
