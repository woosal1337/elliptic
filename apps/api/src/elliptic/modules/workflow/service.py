"""Workflow status business logic."""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.orgs.models import ROLE_ORDER, OrgRole
from elliptic.modules.projects.models import ProjectRole
from elliptic.modules.tasks.models import (
    STATUS_TO_CATEGORY,
    StatusCategory,
    Task,
    TaskKind,
    TaskStatus,
)
from elliptic.modules.workflow.models import (
    ConditionType,
    TransitionCondition,
    WorkflowStatus,
    WorkflowTransition,
)
from elliptic.modules.workflow.schemas import WorkflowStatusIn, WorkflowStatusUpdateIn

DEFAULT_WORKFLOW_SEED: tuple[tuple[TaskStatus, str, str], ...] = (
    (TaskStatus.BACKLOG, "Backlog", "muted-foreground"),
    (TaskStatus.TODO, "Todo", "muted-foreground"),
    (TaskStatus.IN_PROGRESS, "In Progress", "warning"),
    (TaskStatus.IN_REVIEW, "In Review", "accent"),
    (TaskStatus.DONE, "Done", "success"),
    (TaskStatus.CANCELLED, "Cancelled", "danger"),
)

STATUS_DEFAULT_NAME: dict[TaskStatus, str] = {
    status: name for status, name, _ in DEFAULT_WORKFLOW_SEED
}


async def resolve_workflow_status_id(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    team_id: uuid.UUID | None,
    status: TaskStatus,
) -> uuid.UUID | None:
    """Map a fixed TaskStatus to the WorkflowStatus row for the project's scope.

    Uses the team's workflow when the team has overridden it, otherwise the
    org-level default; within the status's category, prefers a name match against
    the default seed, then the lowest-position status.
    """
    scope_team = team_id
    if team_id is not None:
        has_team = await session.scalar(
            select(WorkflowStatus.id)
            .where(WorkflowStatus.org_id == org_id, WorkflowStatus.team_id == team_id)
            .limit(1)
        )
        if has_team is None:
            scope_team = None

    category = STATUS_TO_CATEGORY[status]
    team_clause = (
        WorkflowStatus.team_id.is_(None)
        if scope_team is None
        else WorkflowStatus.team_id == scope_team
    )
    candidates = list(
        await session.scalars(
            select(WorkflowStatus)
            .where(
                WorkflowStatus.org_id == org_id,
                team_clause,
                WorkflowStatus.category == category,
            )
            .order_by(WorkflowStatus.position)
        )
    )
    if not candidates:
        return None
    seed_name = STATUS_DEFAULT_NAME.get(status)
    if seed_name is not None:
        for candidate in candidates:
            if candidate.name == seed_name:
                return candidate.id
    return candidates[0].id


async def seed_org_workflow(session: AsyncSession, org_id: uuid.UUID) -> None:
    """Create the org-level default workflow once, idempotently and silently."""
    existing = await session.scalar(
        select(WorkflowStatus.id).where(
            WorkflowStatus.org_id == org_id, WorkflowStatus.team_id.is_(None)
        )
    )
    if existing is not None:
        return
    for index, (status, name, color) in enumerate(DEFAULT_WORKFLOW_SEED):
        session.add(
            WorkflowStatus(
                org_id=org_id,
                team_id=None,
                name=name,
                category=STATUS_TO_CATEGORY[status],
                color=color,
                position=float(index),
                is_default=status is TaskStatus.BACKLOG,
            )
        )
    await session.flush()


def _require_admin(ctx: OrgContext) -> None:
    if ROLE_ORDER[ctx.role] < ROLE_ORDER[OrgRole.ADMIN]:
        raise ForbiddenError("Requires admin role or higher")


async def list_statuses(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID | None
) -> list[WorkflowStatus]:
    """List statuses for a scope: a team's override, or the org-level default."""
    query = select(WorkflowStatus).where(WorkflowStatus.org_id == ctx.org.id)
    query = query.where(
        WorkflowStatus.team_id == team_id
        if team_id is not None
        else WorkflowStatus.team_id.is_(None)
    )
    result = await session.scalars(query.order_by(WorkflowStatus.position, WorkflowStatus.name))
    return list(result)


async def _get_status(
    session: AsyncSession, ctx: OrgContext, status_id: uuid.UUID
) -> WorkflowStatus:
    status = await session.scalar(
        select(WorkflowStatus).where(
            WorkflowStatus.id == status_id, WorkflowStatus.org_id == ctx.org.id
        )
    )
    if status is None:
        raise NotFoundError("Workflow status not found")
    return status


async def _next_position(
    session: AsyncSession, ctx: OrgContext, team_id: uuid.UUID | None
) -> float:
    query = select(WorkflowStatus.position).where(WorkflowStatus.org_id == ctx.org.id)
    query = query.where(
        WorkflowStatus.team_id == team_id
        if team_id is not None
        else WorkflowStatus.team_id.is_(None)
    )
    positions = list(await session.scalars(query))
    return (max(positions) + 1.0) if positions else 0.0


async def create_status(
    session: AsyncSession, ctx: OrgContext, payload: WorkflowStatusIn
) -> WorkflowStatus:
    """Add a status to a category within an org or team scope (admin only)."""
    _require_admin(ctx)
    clash_query = select(WorkflowStatus.id).where(
        WorkflowStatus.org_id == ctx.org.id, WorkflowStatus.name == payload.name
    )
    clash_query = clash_query.where(
        WorkflowStatus.team_id == payload.team_id
        if payload.team_id is not None
        else WorkflowStatus.team_id.is_(None)
    )
    if await session.scalar(clash_query) is not None:
        raise ConflictError("A status with this name already exists in this scope")
    position = (
        payload.position
        if payload.position is not None
        else await _next_position(session, ctx, payload.team_id)
    )
    status = WorkflowStatus(
        org_id=ctx.org.id,
        team_id=payload.team_id,
        name=payload.name,
        category=payload.category,
        color=payload.color,
        position=position,
        is_default=False,
    )
    session.add(status)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="workflow_status",
        entity_id=status.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": status.name, "category": status.category},
    )
    return status


async def update_status(
    session: AsyncSession,
    ctx: OrgContext,
    status_id: uuid.UUID,
    payload: WorkflowStatusUpdateIn,
) -> WorkflowStatus:
    """Rename, recolor, reorder, or set-default a status (admin only)."""
    _require_admin(ctx)
    status = await _get_status(session, ctx, status_id)
    if payload.name is not None:
        status.name = payload.name
    if payload.color is not None:
        status.color = payload.color
    if payload.position is not None:
        status.position = payload.position
    if payload.allow_new_items is not None:
        status.allow_new_items = payload.allow_new_items
    if payload.is_default is True:
        scope = (
            WorkflowStatus.team_id == status.team_id
            if status.team_id is not None
            else WorkflowStatus.team_id.is_(None)
        )
        await session.execute(
            update(WorkflowStatus)
            .where(WorkflowStatus.org_id == ctx.org.id, scope)
            .values(is_default=False)
        )
        status.is_default = True
    elif payload.is_default is False:
        status.is_default = False
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="workflow_status",
        entity_id=status.id,
        event_type="updated",
        actor_id=ctx.user.id,
        payload={"name": status.name},
    )
    await session.flush()
    return status


_CATEGORY_CANONICAL: dict[StatusCategory, TaskStatus] = {
    StatusCategory.BACKLOG: TaskStatus.BACKLOG,
    StatusCategory.UNSTARTED: TaskStatus.TODO,
    StatusCategory.STARTED: TaskStatus.IN_PROGRESS,
    StatusCategory.COMPLETED: TaskStatus.DONE,
    StatusCategory.CANCELLED: TaskStatus.CANCELLED,
}


async def status_item_count(session: AsyncSession, status_id: uuid.UUID) -> int:
    """How many work items currently sit in a workflow status."""
    count = await session.scalar(
        select(func.count()).select_from(Task).where(Task.workflow_status_id == status_id)
    )
    return int(count or 0)


async def delete_status(
    session: AsyncSession,
    ctx: OrgContext,
    status_id: uuid.UUID,
    transfer_to: uuid.UUID | None = None,
) -> None:
    """Remove a status (admin only); items must be transferred to another status first."""
    _require_admin(ctx)
    status = await _get_status(session, ctx, status_id)
    count = await status_item_count(session, status_id)
    if count > 0:
        if transfer_to is None:
            raise ConflictError(
                f"{count} work items are in this status — choose a status to move them to first"
            )
        if transfer_to == status_id:
            raise ConflictError("Cannot transfer items to the status being deleted")
        target = await _get_status(session, ctx, transfer_to)
        await session.execute(
            update(Task)
            .where(Task.workflow_status_id == status_id)
            .values(
                workflow_status_id=transfer_to,
                status=_CATEGORY_CANONICAL[target.category],
            )
        )
    await session.delete(status)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="workflow_status",
        entity_id=status_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": status.name, "transferred": count},
    )
    await session.flush()


async def status_allows_new_items(
    session: AsyncSession, workflow_status_id: uuid.UUID | None
) -> bool:
    """Whether new work items may be created directly in a workflow status."""
    if workflow_status_id is None:
        return True
    allowed = await session.scalar(
        select(WorkflowStatus.allow_new_items).where(WorkflowStatus.id == workflow_status_id)
    )
    return allowed is not False


async def is_transition_allowed(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    from_status_id: uuid.UUID | None,
    to_status_id: uuid.UUID | None,
    kind: TaskKind | None = None,
) -> bool:
    """Whether a move between two workflow statuses is permitted.

    Open by default: if no transitions are defined out of ``from_status_id``,
    every target is allowed. Type-specific rules (matching ``kind``) take
    precedence over the type-agnostic default for that type (COS-202): if any
    rules exist for this kind, only those apply; otherwise the kind-agnostic
    (null-kind) rules apply.
    """
    if from_status_id is None or to_status_id is None or from_status_id == to_status_id:
        return True
    rows = list(
        await session.execute(
            select(WorkflowTransition.to_status_id, WorkflowTransition.kind).where(
                WorkflowTransition.org_id == org_id,
                WorkflowTransition.from_status_id == from_status_id,
            )
        )
    )
    typed = {target for target, rule_kind in rows if rule_kind == kind}
    if typed:
        return to_status_id in typed
    generic = {target for target, rule_kind in rows if rule_kind is None}
    if not generic:
        return True
    return to_status_id in generic


async def list_transitions(session: AsyncSession, ctx: OrgContext) -> list[WorkflowTransition]:
    """List the org's allowed-transition rules."""
    result = await session.scalars(
        select(WorkflowTransition).where(WorkflowTransition.org_id == ctx.org.id)
    )
    return list(result)


async def transition_required_role(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    from_status_id: uuid.UUID | None,
    to_status_id: uuid.UUID | None,
) -> ProjectRole | None:
    """The minimum project role gating a specific transition, if any."""
    if from_status_id is None or to_status_id is None:
        return None
    return await session.scalar(
        select(WorkflowTransition.required_role).where(
            WorkflowTransition.org_id == org_id,
            WorkflowTransition.from_status_id == from_status_id,
            WorkflowTransition.to_status_id == to_status_id,
        )
    )


async def create_transition(
    session: AsyncSession,
    ctx: OrgContext,
    from_status_id: uuid.UUID,
    to_status_id: uuid.UUID,
    required_role: ProjectRole | None = None,
    kind: TaskKind | None = None,
) -> WorkflowTransition:
    """Allow a transition between two of the org's workflow statuses (admin only).

    A ``kind`` scopes the rule to one work-item type (COS-202); null applies to all.
    """
    _require_admin(ctx)
    if from_status_id == to_status_id:
        raise ConflictError("A transition must connect two different statuses")
    await _get_status(session, ctx, from_status_id)
    await _get_status(session, ctx, to_status_id)
    existing = await session.scalar(
        select(WorkflowTransition.id).where(
            WorkflowTransition.org_id == ctx.org.id,
            WorkflowTransition.from_status_id == from_status_id,
            WorkflowTransition.to_status_id == to_status_id,
            WorkflowTransition.kind == kind,
        )
    )
    if existing is not None:
        raise ConflictError("This transition already exists")
    transition = WorkflowTransition(
        org_id=ctx.org.id,
        from_status_id=from_status_id,
        to_status_id=to_status_id,
        required_role=required_role,
        kind=kind,
    )
    session.add(transition)
    await session.flush()
    return transition


async def delete_transition(
    session: AsyncSession, ctx: OrgContext, transition_id: uuid.UUID
) -> None:
    """Remove an allowed-transition rule (admin only)."""
    _require_admin(ctx)
    transition = await session.scalar(
        select(WorkflowTransition).where(
            WorkflowTransition.id == transition_id, WorkflowTransition.org_id == ctx.org.id
        )
    )
    if transition is None:
        raise NotFoundError("Transition not found")
    await session.delete(transition)
    await session.flush()


def _condition_failure(condition: ConditionType, task: Task) -> str | None:
    """Return a human reason if a declarative condition is unmet, else None (COS-220)."""
    if condition is ConditionType.REQUIRE_ASSIGNEE and task.assignee_id is None:
        return "an assignee is required"
    if condition is ConditionType.REQUIRE_ESTIMATE and not task.estimate:
        return "an estimate is required"
    if condition is ConditionType.REQUIRE_DUE_DATE and task.due_date is None:
        return "a due date is required"
    if condition is ConditionType.REQUIRE_DOD_COMPLETE:
        items = task.dod_items or []
        if items and not all(bool(item.get("done")) for item in items):
            return "all Definition-of-Done items must be checked"
    return None


async def evaluate_transition_conditions(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    task: Task,
    from_status_id: uuid.UUID | None,
    to_status_id: uuid.UUID | None,
) -> str | None:
    """Evaluate ordered blocking conditions for a transition; return the first failure reason."""
    if from_status_id is None or to_status_id is None:
        return None
    conditions = list(
        await session.scalars(
            select(TransitionCondition)
            .where(
                TransitionCondition.org_id == org_id,
                TransitionCondition.from_status_id == from_status_id,
                TransitionCondition.to_status_id == to_status_id,
            )
            .order_by(TransitionCondition.position, TransitionCondition.created_at)
        )
    )
    for condition in conditions:
        reason = _condition_failure(condition.condition, task)
        if reason is not None:
            return reason
    return None


async def list_conditions(session: AsyncSession, ctx: OrgContext) -> list[TransitionCondition]:
    result = await session.scalars(
        select(TransitionCondition).where(TransitionCondition.org_id == ctx.org.id)
    )
    return list(result)


async def create_condition(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    from_status_id: uuid.UUID,
    to_status_id: uuid.UUID,
    condition: ConditionType,
) -> TransitionCondition:
    _require_admin(ctx)
    await _get_status(session, ctx, from_status_id)
    await _get_status(session, ctx, to_status_id)
    existing = await session.scalar(
        select(TransitionCondition.id).where(
            TransitionCondition.org_id == ctx.org.id,
            TransitionCondition.from_status_id == from_status_id,
            TransitionCondition.to_status_id == to_status_id,
            TransitionCondition.condition == condition,
        )
    )
    if existing is not None:
        raise ConflictError("This condition already exists")
    row = TransitionCondition(
        org_id=ctx.org.id,
        from_status_id=from_status_id,
        to_status_id=to_status_id,
        condition=condition,
    )
    session.add(row)
    await session.flush()
    return row


async def delete_condition(session: AsyncSession, ctx: OrgContext, condition_id: uuid.UUID) -> None:
    _require_admin(ctx)
    row = await session.scalar(
        select(TransitionCondition).where(
            TransitionCondition.id == condition_id, TransitionCondition.org_id == ctx.org.id
        )
    )
    if row is None:
        raise NotFoundError("Condition not found")
    await session.delete(row)
    await session.flush()
