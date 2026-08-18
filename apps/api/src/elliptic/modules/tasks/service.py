"""Task and label business logic."""

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Literal

from loguru import logger
from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.core.pagination import PageParams
from elliptic.core.text import content_tokens, token_overlap
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.activity.service import record_activity
from elliptic.modules.automation.models import AutomationTrigger
from elliptic.modules.automation.service import run_trigger
from elliptic.modules.comments.models import Comment, CommentEntityType
from elliptic.modules.meetings.models import Meeting, meeting_attendees
from elliptic.modules.notes.models import Note
from elliptic.modules.notifications.models import NotificationType
from elliptic.modules.notifications.service import notify
from elliptic.modules.orgs.models import ROLE_ORDER, OrganizationMember, OrgRole
from elliptic.modules.projects.models import Project, ProjectStatus, ProjectSubscription
from elliptic.modules.projects.service import (
    is_project_member,
    lock_project,
    next_task_number,
    require_project_role,
)
from elliptic.modules.sync import service as sync_service
from elliptic.modules.tasks import type_levels
from elliptic.modules.tasks.models import (
    BOARD_STATUSES,
    CATEGORY_RANK,
    PROGRESS_EXCLUDED_STATUSES,
    STATUS_TO_CATEGORY,
    BugSeverity,
    Label,
    NotDuplicatePair,
    RelationTypeDef,
    ScheduleDependencyType,
    StatusCategory,
    Task,
    TaskDescriptionVersion,
    TaskKind,
    TaskLink,
    TaskNoteLink,
    TaskPriority,
    TaskRelation,
    TaskRelationType,
    TaskScheduleLink,
    TaskStatus,
    TaskSubscription,
    WorkItemTemplate,
    WorkItemUpdate,
    task_labels,
)
from elliptic.modules.tasks.schemas import (
    LabelCreateIn,
    LatestCommentOut,
    TaskBatchCreateIn,
    TaskCreateIn,
    TaskLinkIn,
    TaskOut,
    TaskUpdateIn,
    WorkItemTemplateCreateIn,
    WorkItemUpdateCreateIn,
)
from elliptic.modules.users.models import User
from elliptic.modules.workflow.service import (
    evaluate_transition_conditions,
    is_transition_allowed,
    resolve_workflow_status_id,
    status_allows_new_items,
    transition_required_role,
)

SORT_ORDER_STEP = 1024.0

CREATION_GRACE_SECONDS = 180

MIN_DUPLICATE_TOKEN_OVERLAP = 2

BUG_SLA_DAYS: dict[BugSeverity, int] = {
    BugSeverity.CRITICAL: 1,
    BugSeverity.HIGH: 3,
    BugSeverity.MEDIUM: 7,
    BugSeverity.LOW: 30,
}


def task_to_out(
    task: Task,
    project_key: str,
    *,
    subtask_total: int = 0,
    subtask_done: int = 0,
    blocked: bool = False,
    comment_count: int = 0,
    latest_comment: LatestCommentOut | None = None,
) -> TaskOut:
    """Serialize a task with its KEY-number identifier."""
    return TaskOut.model_validate(
        {
            "id": task.id,
            "org_id": task.org_id,
            "project_id": task.project_id,
            "number": task.number,
            "identifier": f"{project_key}-{task.number}",
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "category": STATUS_TO_CATEGORY[task.status],
            "priority": task.priority,
            "assignee_id": task.assignee_id,
            "start_date": task.start_date,
            "due_date": task.due_date,
            "sort_order": task.sort_order,
            "labels": task.labels,
            "created_by": task.created_by,
            "parent_task_id": task.parent_task_id,
            "source_meeting_id": task.source_meeting_id,
            "source_note_id": task.source_note_id,
            "cycle_id": task.cycle_id,
            "milestone_id": task.milestone_id,
            "module_id": task.module_id,
            "workflow_status_id": task.workflow_status_id,
            "custom_fields": task.custom_fields,
            "dod_items": task.dod_items,
            "acceptance_criteria": task.acceptance_criteria,
            "estimate": task.estimate,
            "kind": task.kind,
            "severity": task.severity,
            "component": task.component,
            "external_source": task.external_source,
            "external_id": task.external_id,
            "archived_at": task.archived_at,
            "subtask_total": subtask_total,
            "subtask_done": subtask_done,
            "blocked": blocked,
            "comment_count": comment_count,
            "latest_comment": latest_comment,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }
    )


async def _comment_context(
    session: AsyncSession, task_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[int, LatestCommentOut | None]]:
    """Return {task_id: (comment_count, latest_comment)} for the given tasks."""
    if not task_ids:
        return {}
    count_rows = await session.execute(
        select(Comment.entity_id, func.count())
        .where(
            Comment.entity_type == CommentEntityType.TASK,
            Comment.entity_id.in_(task_ids),
        )
        .group_by(Comment.entity_id)
    )
    counts: dict[uuid.UUID, int] = {row[0]: row[1] for row in count_rows}
    latest_rows = await session.execute(
        select(Comment.entity_id, Comment.content, User.full_name)
        .join(User, User.id == Comment.author_id)
        .where(
            Comment.entity_type == CommentEntityType.TASK,
            Comment.entity_id.in_(task_ids),
        )
        .order_by(Comment.entity_id, Comment.created_at.desc(), Comment.id.desc())
    )
    latest: dict[uuid.UUID, LatestCommentOut] = {}
    for entity_id, content, author_name in latest_rows:
        if entity_id not in latest:
            latest[entity_id] = LatestCommentOut(content=content, author_name=author_name)
    return {task_id: (counts.get(task_id, 0), latest.get(task_id)) for task_id in task_ids}


async def _subtask_counts(
    session: AsyncSession, parent_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[int, int]]:
    """Return {parent_id: (total, done)} for the given parent task ids.

    Progress is computed off status categories: cancelled and duplicate
    sub-tasks are excluded from the total, and done counts the completed
    category, so a parent's pill reflects category math, not raw status strings.
    """
    if not parent_ids:
        return {}
    rows = await session.execute(
        select(
            Task.parent_task_id,
            func.count().filter(Task.status.notin_(PROGRESS_EXCLUDED_STATUSES)),
            func.count().filter(Task.status == TaskStatus.DONE),
        )
        .where(Task.parent_task_id.in_(parent_ids))
        .group_by(Task.parent_task_id)
    )
    return {pid: (total, done) for pid, total, done in rows if pid is not None}


async def _blocked_ids(session: AsyncSession, task_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    """Return the subset of task_ids that have an active (non-done) blocker."""
    if not task_ids:
        return set()
    blocker = aliased(Task)
    rows = await session.execute(
        select(TaskRelation.target_task_id)
        .join(blocker, blocker.id == TaskRelation.source_task_id)
        .where(
            TaskRelation.target_task_id.in_(task_ids),
            TaskRelation.type == TaskRelationType.BLOCKS,
            blocker.status.notin_((TaskStatus.DONE, TaskStatus.CANCELLED)),
        )
    )
    return {row[0] for row in rows}


async def serialize_tasks(
    session: AsyncSession, tasks: list[Task], project_key: str
) -> list[TaskOut]:
    """Serialize a homogeneous list of tasks, batch-computing subtask + blocked state."""
    ids = [task.id for task in tasks]
    counts = await _subtask_counts(session, ids)
    blocked = await _blocked_ids(session, ids)
    comments = await _comment_context(session, ids)
    return [
        task_to_out(
            task,
            project_key,
            subtask_total=counts.get(task.id, (0, 0))[0],
            subtask_done=counts.get(task.id, (0, 0))[1],
            blocked=task.id in blocked,
            comment_count=comments.get(task.id, (0, None))[0],
            latest_comment=comments.get(task.id, (0, None))[1],
        )
        for task in tasks
    ]


async def serialize_task(session: AsyncSession, task: Task, project_key: str) -> TaskOut:
    """Serialize a single task with its computed subtask + blocked state."""
    out = await serialize_tasks(session, [task], project_key)
    return out[0]


async def serialize_mixed_tasks(
    session: AsyncSession, tasks_with_keys: list[tuple[Task, str]]
) -> list[TaskOut]:
    """Serialize tasks drawn from multiple projects, each with its own key."""
    ids = [task.id for task, _ in tasks_with_keys]
    counts = await _subtask_counts(session, ids)
    blocked = await _blocked_ids(session, ids)
    comments = await _comment_context(session, ids)
    return [
        task_to_out(
            task,
            project_key,
            subtask_total=counts.get(task.id, (0, 0))[0],
            subtask_done=counts.get(task.id, (0, 0))[1],
            blocked=task.id in blocked,
            comment_count=comments.get(task.id, (0, None))[0],
            latest_comment=comments.get(task.id, (0, None))[1],
        )
        for task, project_key in tasks_with_keys
    ]


async def create_label(session: AsyncSession, ctx: OrgContext, payload: LabelCreateIn) -> Label:
    """Create an org-scoped label."""
    existing = await session.scalar(
        select(Label).where(Label.org_id == ctx.org.id, Label.name == payload.name)
    )
    if existing is not None:
        raise ConflictError("A label with this name already exists")
    label = Label(org_id=ctx.org.id, name=payload.name, color=payload.color)
    session.add(label)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="label",
        entity_id=label.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": label.name},
    )
    return label


async def list_labels(session: AsyncSession, ctx: OrgContext) -> list[Label]:
    """List org labels."""
    result = await session.scalars(
        select(Label).where(Label.org_id == ctx.org.id).order_by(Label.name)
    )
    return list(result)


async def delete_label(session: AsyncSession, ctx: OrgContext, label_id: uuid.UUID) -> None:
    """Delete an org label."""
    label = await session.scalar(
        select(Label).where(Label.id == label_id, Label.org_id == ctx.org.id)
    )
    if label is None:
        raise NotFoundError("Label not found")
    await session.delete(label)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="label",
        entity_id=label_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": label.name},
    )
    await session.flush()


async def _resolve_labels(
    session: AsyncSession, ctx: OrgContext, label_ids: list[uuid.UUID]
) -> list[Label]:
    if not label_ids:
        return []
    result = await session.scalars(
        select(Label).where(Label.org_id == ctx.org.id, Label.id.in_(label_ids))
    )
    labels = list(result)
    if len(labels) != len(set(label_ids)):
        raise BadRequestError("One or more labels not found")
    return labels


async def _is_guest(session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID) -> bool:
    """Whether a user is a workspace guest (capped tier, never assignable)."""
    org_role: OrgRole | None = await session.scalar(
        select(OrganizationMember.role).where(
            OrganizationMember.org_id == ctx.org.id,
            OrganizationMember.user_id == user_id,
        )
    )
    return org_role is OrgRole.GUEST


async def _validate_assignee(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, assignee_id: uuid.UUID
) -> None:
    if not await is_project_member(session, ctx, project_id, assignee_id):
        raise BadRequestError("Assignee must be a member of the project")
    if await _is_guest(session, ctx, assignee_id):
        raise BadRequestError("Guests cannot be assigned to work items")


async def _require_project_access(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> None:
    if ROLE_ORDER[ctx.role] >= ROLE_ORDER[OrgRole.ADMIN]:
        return
    if not await is_project_member(session, ctx, project_id, ctx.user.id):
        raise ForbiddenError("Not a member of this project")


def _require_not_archived(project: Project) -> None:
    if project.status == ProjectStatus.ARCHIVED:
        raise BadRequestError("Project is archived")


async def get_task(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> Task:
    """Fetch a task within the org or 404."""
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.labels))
        .where(Task.id == task_id, Task.org_id == ctx.org.id)
    )
    if task is None:
        raise NotFoundError("Task not found")
    return task


async def get_task_with_project(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> tuple[Task, Project]:
    """Fetch a task and its project within the org or 404, enforcing project access."""
    task = await get_task(session, ctx, task_id)
    project = await session.scalar(select(Project).where(Project.id == task.project_id))
    if project is None:
        raise NotFoundError("Project not found")
    await _require_project_access(session, ctx, project.id)
    return task, project


async def get_task_by_identifier(
    session: AsyncSession, ctx: OrgContext, identifier: str
) -> tuple[Task, Project]:
    """Resolve a task by its readable KEY-N identifier within the org."""
    key, _, number_str = identifier.rpartition("-")
    if not key or not number_str.isdigit():
        raise NotFoundError("Task not found")
    number = int(number_str)
    project = await session.scalar(
        select(Project).where(Project.org_id == ctx.org.id, func.upper(Project.key) == key.upper())
    )
    if project is None:
        raise NotFoundError("Task not found")
    await _require_project_access(session, ctx, project.id)
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.labels))
        .where(
            Task.project_id == project.id,
            Task.number == number,
            Task.org_id == ctx.org.id,
        )
    )
    if task is None:
        raise NotFoundError("Task not found")
    return task, project


async def _validate_parent(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    parent_task_id: uuid.UUID,
    child_kind: TaskKind,
) -> None:
    parent = await session.scalar(
        select(Task).where(Task.id == parent_task_id, Task.org_id == ctx.org.id)
    )
    if parent is None:
        raise BadRequestError("Parent task not found")
    if parent.project_id != project_id:
        raise BadRequestError("A sub-task must live in the same project as its parent")
    if parent.parent_task_id is not None:
        raise BadRequestError("Sub-tasks are limited to a single level")
    levels = await type_levels.level_map(session, ctx)
    if levels.get(child_kind, 1) > levels.get(parent.kind, 1):
        raise BadRequestError(f"A {child_kind.value} cannot be nested under a {parent.kind.value}")


async def _validate_source_meeting(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID
) -> None:
    meeting = await session.scalar(
        select(Meeting.id).where(Meeting.id == meeting_id, Meeting.org_id == ctx.org.id)
    )
    if meeting is None:
        raise BadRequestError("Source meeting not found")


async def _validate_source_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> None:
    note = await session.scalar(
        select(Note.id).where(Note.id == note_id, Note.org_id == ctx.org.id)
    )
    if note is None:
        raise BadRequestError("Source note not found")


async def _process_mentions(
    session: AsyncSession,
    ctx: OrgContext,
    task: Task,
    project: Project,
    user_ids: list[uuid.UUID],
    related_task_ids: list[uuid.UUID],
) -> None:
    """Subscribe + notify mentioned org members and link @-referenced tasks (NOTE-01)."""
    if user_ids:
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
            await _auto_subscribe(session, ctx, task.id, user_id)
            try:
                await notify(
                    session,
                    org_id=ctx.org.id,
                    recipient_id=user_id,
                    type=NotificationType.MENTIONED,
                    entity_type="task",
                    entity_id=task.id,
                    actor_id=ctx.user.id,
                    title=f"{project.key}-{task.number} mentions you",
                    snippet=task.title,
                )
            except Exception:
                logger.exception("Failed to emit mention notification for task {}", task.id)
    for related_id in dict.fromkeys(related_task_ids):
        if related_id == task.id:
            continue
        try:
            await create_relation(session, ctx, task.id, related_id, "related")
        except (ConflictError, BadRequestError):
            continue


def _bug_sla_due_date(severity: BugSeverity | None) -> date | None:
    if severity is None:
        return None
    return (datetime.now(UTC) + timedelta(days=BUG_SLA_DAYS[severity])).date()


def _within_creation_grace(task: Task) -> bool:
    """Report whether a task is still inside its creation grace window."""
    return utcnow() - task.created_at < timedelta(seconds=CREATION_GRACE_SECONDS)


async def _upsert_external_task(
    session: AsyncSession, ctx: OrgContext, payload: TaskCreateIn
) -> tuple[Task, Project] | None:
    """Idempotent import: if a task with this external (source, id) exists, update it.

    Returns the (task, project) pair on a hit, or None when no match exists so the
    caller proceeds to create a fresh task.
    """
    existing: Task | None = await session.scalar(
        select(Task)
        .where(
            Task.org_id == ctx.org.id,
            Task.external_source == payload.external_source,
            Task.external_id == payload.external_id,
        )
        .options(selectinload(Task.labels))
    )
    if existing is None:
        return None
    project: Project | None = await session.get(Project, existing.project_id)
    if project is None:
        return None
    existing.title = payload.title
    if payload.description is not None:
        existing.description = payload.description
    existing.status = payload.status
    existing.priority = payload.priority
    await session.flush()
    return existing, project


async def _resolve_create_assignee(
    session: AsyncSession,
    ctx: OrgContext,
    project: Project,
    payload: TaskCreateIn,
    *,
    assign_to_creator: bool,
) -> uuid.UUID | None:
    """Pick the effective assignee: explicit, else the project default, else the
    creator. `unassigned` opts out of every fallback."""
    if payload.unassigned:
        return None
    if payload.assignee_id is not None:
        await _validate_assignee(session, ctx, project.id, payload.assignee_id)
        return payload.assignee_id
    if (
        project.default_assignee_id is not None
        and await is_project_member(session, ctx, project.id, project.default_assignee_id)
        and not await _is_guest(session, ctx, project.default_assignee_id)
    ):
        return project.default_assignee_id
    if (
        assign_to_creator
        and await is_project_member(session, ctx, project.id, ctx.user.id)
        and not await _is_guest(session, ctx, ctx.user.id)
    ):
        return ctx.user.id
    return None


async def create_task(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    payload: TaskCreateIn,
    *,
    assign_to_creator: bool = True,
) -> tuple[Task, Project]:
    """Create a task with a concurrency-safe per-project number.

    Bulk callers pass `assign_to_creator=False` so an import doesn't land every
    row on whoever ran it.
    """
    await _require_project_access(session, ctx, project_id)
    if payload.external_source and payload.external_id:
        upserted = await _upsert_external_task(session, ctx, payload)
        if upserted is not None:
            return upserted
    project = await lock_project(session, ctx, project_id)
    _require_not_archived(project)
    effective_assignee = await _resolve_create_assignee(
        session, ctx, project, payload, assign_to_creator=assign_to_creator
    )
    if payload.parent_task_id is not None:
        await _validate_parent(session, ctx, project.id, payload.parent_task_id, payload.kind)
    if payload.source_meeting_id is not None:
        await _validate_source_meeting(session, ctx, payload.source_meeting_id)
    if payload.source_note_id is not None:
        await _validate_source_note(session, ctx, payload.source_note_id)
    if payload.kind == TaskKind.BUG and payload.severity is None:
        raise BadRequestError("A bug requires a severity")
    labels = await _resolve_labels(session, ctx, payload.label_ids)
    number = await next_task_number(session, project)
    due_date = payload.due_date
    if due_date is None and payload.kind == TaskKind.BUG:
        due_date = _bug_sla_due_date(payload.severity)
    task = Task(
        org_id=ctx.org.id,
        project_id=project.id,
        number=number,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        assignee_id=effective_assignee,
        start_date=payload.start_date,
        due_date=due_date,
        sort_order=number * SORT_ORDER_STEP,
        created_by=ctx.user.id,
        parent_task_id=payload.parent_task_id,
        source_meeting_id=payload.source_meeting_id,
        source_note_id=payload.source_note_id,
        kind=payload.kind,
        severity=payload.severity,
        component=payload.component,
        external_source=payload.external_source,
        external_id=payload.external_id,
        labels=labels,
    )
    workflow_status_id = await resolve_workflow_status_id(
        session, org_id=ctx.org.id, team_id=project.team_id, status=task.status
    )
    if not await status_allows_new_items(session, workflow_status_id):
        raise BadRequestError("New work items can't be created in this status")
    session.add(task)
    await session.flush()
    task.workflow_status_id = workflow_status_id
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=task.id,
        event_type="created",
        actor_id=ctx.user.id,
        project_id=task.project_id,
        payload={"identifier": f"{project.key}-{task.number}", "title": task.title},
    )
    await _auto_subscribe(session, ctx, task.id, ctx.user.id)
    if task.assignee_id is not None:
        await _auto_subscribe(session, ctx, task.id, task.assignee_id)
    await _process_mentions(
        session, ctx, task, project, payload.mention_user_ids, payload.related_task_ids
    )
    await _emit_task_created(session, ctx, task, project)
    return task, project


async def batch_create_tasks(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: TaskBatchCreateIn
) -> tuple[list[Task], Project]:
    """Create several tasks from text lines, sharing source provenance (NOTE-02)."""
    created: list[Task] = []
    project: Project | None = None
    for raw_title in payload.titles:
        title = raw_title.strip()
        if not title:
            continue
        item = TaskCreateIn(
            title=title[:500],
            source_note_id=payload.source_note_id,
            source_meeting_id=payload.source_meeting_id,
        )
        task, project = await create_task(session, ctx, project_id, item)
        created.append(task)
    if project is None:
        raise BadRequestError("No task titles provided")
    return created, project


async def list_tasks(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    page: PageParams,
    *,
    status: TaskStatus | None = None,
    assignee_id: uuid.UUID | None = None,
    label_id: uuid.UUID | None = None,
    severity: BugSeverity | None = None,
    module_id: uuid.UUID | None = None,
    cycle_id: uuid.UUID | None = None,
    search: str | None = None,
    include_archived: bool = False,
) -> tuple[list[Task], Project, int]:
    """List tasks of a project with optional filters."""
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")
    await _require_project_access(session, ctx, project.id)
    query: Select[tuple[Task]] = select(Task).where(
        Task.org_id == ctx.org.id, Task.project_id == project.id
    )
    if not include_archived:
        query = query.where(Task.archived_at.is_(None))
    if status is not None:
        query = query.where(Task.status == status)
    if assignee_id is not None:
        query = query.where(Task.assignee_id == assignee_id)
    if severity is not None:
        query = query.where(Task.severity == severity)
    if module_id is not None:
        query = query.where(Task.module_id == module_id)
    if cycle_id is not None:
        query = query.where(Task.cycle_id == cycle_id)
    if label_id is not None:
        query = query.join(task_labels, task_labels.c.task_id == Task.id).where(
            task_labels.c.label_id == label_id
        )
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    result = await session.scalars(
        query.options(selectinload(Task.labels))
        .order_by(Task.sort_order, Task.number)
        .limit(page.limit)
        .offset(page.offset)
    )
    return list(result), project, total


async def board(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> tuple[dict[TaskStatus, list[Task]], Project]:
    """Group all project tasks by status for the board view."""
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")
    await _require_project_access(session, ctx, project.id)
    result = await session.scalars(
        select(Task)
        .options(selectinload(Task.labels))
        .where(
            Task.org_id == ctx.org.id,
            Task.project_id == project.id,
        )
        .order_by(Task.sort_order, Task.number)
    )
    columns: dict[TaskStatus, list[Task]] = {status: [] for status in BOARD_STATUSES}
    for task in result:
        if task.status in columns:
            columns[task.status].append(task)
    return columns, project


UserTaskScope = Literal["assigned", "created", "subscribed", "recent", "all"]

_PRIORITY_ORDER = case(
    (Task.priority == TaskPriority.URGENT, 0),
    (Task.priority == TaskPriority.HIGH, 1),
    (Task.priority == TaskPriority.MEDIUM, 2),
    (Task.priority == TaskPriority.LOW, 3),
    else_=4,
)

_COMPLETION_ORDER = case(
    (Task.status.in_((TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.DUPLICATE)), 1),
    else_=0,
)


async def list_user_tasks(
    session: AsyncSession,
    ctx: OrgContext,
    scope: UserTaskScope,
    page: PageParams,
) -> tuple[list[tuple[Task, str]], int]:
    """List the current user's tasks for a My-Work tab, across all their projects.

    assigned/created/subscribed filter by the user's relationship to the task;
    recent unions all three; all applies no relationship filter, so a member
    sees every task in the org. Non-recent tabs use a focus-style ordering —
    open work first, then by priority — while recent orders by latest activity.
    """
    base = (
        select(Task, Project.key)
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.org_id == ctx.org.id,
            Task.archived_at.is_(None),
        )
    )
    subscribed_ids = select(TaskSubscription.task_id).where(
        TaskSubscription.org_id == ctx.org.id, TaskSubscription.user_id == ctx.user.id
    )
    if scope == "all":
        pass  # org-wide: the base query is already scoped to this organization
    elif scope == "assigned":
        base = base.where(Task.assignee_id == ctx.user.id)
    elif scope == "created":
        base = base.where(Task.created_by == ctx.user.id)
    elif scope == "subscribed":
        base = base.where(Task.id.in_(subscribed_ids))
    else:
        base = base.where(
            or_(
                Task.assignee_id == ctx.user.id,
                Task.created_by == ctx.user.id,
                Task.id.in_(subscribed_ids),
            )
        )
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    ordering = (
        (Task.updated_at.desc(),)
        if scope == "recent"
        else (_COMPLETION_ORDER, _PRIORITY_ORDER, Task.updated_at.desc())
    )
    rows = await session.execute(
        base.options(selectinload(Task.labels))
        .order_by(*ordering)
        .limit(page.limit)
        .offset(page.offset)
    )
    return [(task, key) for task, key in rows], total


def _apply_kind_and_severity(task: Task, payload: TaskUpdateIn) -> None:
    """Apply kind/severity/custom-field edits and enforce the bug-needs-severity invariant."""
    if payload.custom_fields is not None:
        task.custom_fields = payload.custom_fields
    if payload.dod_items is not None:
        task.dod_items = [item.model_dump() for item in payload.dod_items]
    if payload.acceptance_criteria is not None:
        task.acceptance_criteria = payload.acceptance_criteria or None
    if payload.estimate is not None:
        task.estimate = payload.estimate or None
    if payload.kind is not None:
        task.kind = payload.kind
        if payload.kind == TaskKind.TASK:
            task.severity = None
    if payload.clear_severity:
        task.severity = None
    elif payload.severity is not None:
        task.severity = payload.severity
    if task.kind == TaskKind.BUG and task.severity is None:
        raise BadRequestError("A bug requires a severity")
    if payload.clear_component:
        task.component = None
    elif payload.component is not None:
        task.component = payload.component


async def convert_task_kind(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, new_kind: TaskKind
) -> tuple[Task, Project]:
    """Convert a work item to a different type (e.g. promote a task to an epic).

    An epic is a top-level container, so converting to one detaches any parent.
    Converting to a plain task drops bug severity; converting to a bug without a
    severity defaults it to medium so the item stays valid.
    """
    task, project = await get_task_with_project(session, ctx, task_id)
    if task.kind == new_kind:
        return task, project
    previous = task.kind
    task.kind = new_kind
    if new_kind == TaskKind.EPIC:
        task.parent_task_id = None
    if new_kind == TaskKind.TASK:
        task.severity = None
    if new_kind == TaskKind.BUG and task.severity is None:
        task.severity = BugSeverity.MEDIUM
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=task.id,
        event_type="task.kind_converted",
        actor_id=ctx.user.id,
        payload={"from": previous, "to": new_kind},
    )
    return task, project


async def duplicate_task(
    session: AsyncSession,
    ctx: OrgContext,
    task_id: uuid.UUID,
    target_project_id: uuid.UUID | None = None,
) -> tuple[Task, Project]:
    """Clone a work item (content + labels) into the same or another project.

    Relations, sub-tasks, comments, and cycle/milestone links are NOT copied — a
    duplicate is an independent top-level item titled '… (copy)'. Across projects
    the assignee is dropped (membership differs); within a project it is kept.
    """
    source, source_project = await get_task_with_project(session, ctx, task_id)
    cross_project = target_project_id is not None and target_project_id != source_project.id
    if cross_project:
        await _require_project_access(session, ctx, target_project_id)  # type: ignore[arg-type]
        target = await lock_project(session, ctx, target_project_id)  # type: ignore[arg-type]
    else:
        target = await lock_project(session, ctx, source_project.id)
    _require_not_archived(target)
    number = await next_task_number(session, target)
    copy = Task(
        org_id=ctx.org.id,
        project_id=target.id,
        number=number,
        title=f"{source.title} (copy)"[:500],
        description=source.description,
        status=source.status,
        priority=source.priority,
        assignee_id=None if cross_project else source.assignee_id,
        due_date=source.due_date,
        sort_order=number * SORT_ORDER_STEP,
        created_by=ctx.user.id,
        kind=source.kind,
        severity=source.severity,
        custom_fields=dict(source.custom_fields),
        estimate=source.estimate,
        dod_items=list(source.dod_items),
        acceptance_criteria=source.acceptance_criteria,
        labels=list(source.labels),
    )
    session.add(copy)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=copy.id,
        event_type="task.duplicated",
        actor_id=ctx.user.id,
        project_id=copy.project_id,
        payload={"source_id": str(source.id)},
    )
    return copy, target


async def update_task(  # noqa: PLR0912
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, payload: TaskUpdateIn
) -> tuple[Task, Project]:
    """Apply updates to a task."""
    task, project = await get_task_with_project(session, ctx, task_id)
    _require_not_archived(project)
    previous_assignee = task.assignee_id
    previous_priority = task.priority
    changes: dict[str, str] = {}
    if payload.title is not None:
        task.title = payload.title
        changes["title"] = payload.title
    if payload.description is not None and payload.description != task.description:
        _snapshot_description(session, ctx, task)
        task.description = payload.description
    if payload.priority is not None:
        task.priority = payload.priority
        changes["priority"] = payload.priority
    if payload.clear_assignee:
        task.assignee_id = None
        changes["assignee"] = "cleared"
    elif payload.assignee_id is not None:
        await _validate_assignee(session, ctx, task.project_id, payload.assignee_id)
        task.assignee_id = payload.assignee_id
        changes["assignee"] = str(payload.assignee_id)
    if payload.start_date is not None:
        task.start_date = payload.start_date
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.sort_order is not None:
        task.sort_order = payload.sort_order
    if payload.label_ids is not None:
        task.labels = await _resolve_labels(session, ctx, payload.label_ids)
    _apply_kind_and_severity(task, payload)
    if not _within_creation_grace(task):
        event_type = "assigned" if "assignee" in changes else "updated"
        await record_activity(
            session,
            org_id=ctx.org.id,
            entity_type="task",
            entity_id=task.id,
            event_type=event_type,
            actor_id=ctx.user.id,
            project_id=task.project_id,
            payload=changes or None,
        )
    await session.flush()
    if task.assignee_id is not None and task.assignee_id != previous_assignee:
        await _auto_subscribe(session, ctx, task.id, task.assignee_id)
    if task.assignee_id is not None and task.assignee_id not in {previous_assignee, ctx.user.id}:
        await _emit_assigned(session, ctx, task, project)
    if (
        task.priority == TaskPriority.URGENT
        and previous_priority != TaskPriority.URGENT
        and task.assignee_id is not None
    ):
        await _emit_urgent(session, ctx, task, project)
    await _process_mentions(
        session, ctx, task, project, payload.mention_user_ids, payload.related_task_ids
    )
    return task, project


async def set_task_archived(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, archived: bool
) -> tuple[Task, Project]:
    """Archive or restore a task (a reversible state distinct from delete)."""
    task, project = await get_task_with_project(session, ctx, task_id)
    task.archived_at = utcnow() if archived else None
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=task.id,
        event_type="archived" if archived else "unarchived",
        actor_id=ctx.user.id,
        project_id=task.project_id,
    )
    await session.flush()
    return task, project


async def _emit_assigned(
    session: AsyncSession, ctx: OrgContext, task: Task, project: Project
) -> None:
    try:
        await notify(
            session,
            org_id=ctx.org.id,
            recipient_id=task.assignee_id,  # type: ignore[arg-type]
            type=NotificationType.ASSIGNED,
            entity_type="task",
            entity_id=task.id,
            actor_id=ctx.user.id,
            title=f"{project.key}-{task.number} assigned to you",
            snippet=task.title,
        )
    except Exception:
        logger.exception("Failed to emit assignment notification for task {}", task.id)


async def _emit_urgent(
    session: AsyncSession, ctx: OrgContext, task: Task, project: Project
) -> None:
    try:
        await notify(
            session,
            org_id=ctx.org.id,
            recipient_id=task.assignee_id,  # type: ignore[arg-type]
            type=NotificationType.URGENT,
            entity_type="task",
            entity_id=task.id,
            actor_id=ctx.user.id,
            title=f"{project.key}-{task.number} marked urgent",
            snippet=task.title,
        )
    except Exception:
        logger.exception("Failed to emit urgent notification for task {}", task.id)


async def _board_recipients(
    session: AsyncSession, ctx: OrgContext, task: Task, *, project_id: uuid.UUID | None = None
) -> set[uuid.UUID]:
    """Everyone who should hear that this task appeared or moved.

    Subscribers are the opt-in signal, but the assignee and the creator are
    included whether or not they ever pressed subscribe — they are the two people
    the task is actually about. The actor stays in deliberately: these events are
    receipts, so filtering them here would quietly undo ``allow_self`` at the
    call site.

    A brand-new task has no subscribers yet, so creation reads the project's
    watchers instead; that is what ``project_id`` selects.
    """
    if project_id is not None:
        rows = await session.scalars(
            select(ProjectSubscription.user_id).where(ProjectSubscription.project_id == project_id)
        )
    else:
        rows = await session.scalars(
            select(TaskSubscription.user_id).where(TaskSubscription.task_id == task.id)
        )
    recipients = set(rows)
    recipients.update(u for u in (task.assignee_id, task.created_by, ctx.user.id) if u is not None)
    return recipients


async def _emit_task_created(
    session: AsyncSession, ctx: OrgContext, task: Task, project: Project
) -> None:
    """Tell the project's watchers that a task appeared, its creator included."""
    try:
        recipients = await _board_recipients(session, ctx, task, project_id=project.id)
        # An assignee already receives the more specific "assigned to you" for
        # this same creation, so they are dropped here rather than pushed twice
        # for one event. Assigning to yourself is the exception: that one is
        # suppressed as self-directed, leaving this as the only notification.
        if task.assignee_id is not None and task.assignee_id != ctx.user.id:
            recipients.discard(task.assignee_id)
        identifier = f"{project.key}-{task.number}"
        for recipient_id in recipients:
            await notify(
                session,
                org_id=ctx.org.id,
                recipient_id=recipient_id,
                type=NotificationType.TASK_CREATED,
                entity_type="task",
                entity_id=task.id,
                actor_id=ctx.user.id,
                title=f"{identifier} created",
                snippet=task.title,
                identifier=identifier,
                allow_self=True,
            )
    except Exception:
        logger.exception("Failed to emit created notification for task {}", task.id)


async def _emit_status_changed(
    session: AsyncSession, ctx: OrgContext, task: Task, project: Project, previous: TaskStatus
) -> None:
    """Tell a task's watchers it moved, whoever moved it included."""
    try:
        recipients = await _board_recipients(session, ctx, task)
        identifier = f"{project.key}-{task.number}"
        for recipient_id in recipients:
            await notify(
                session,
                org_id=ctx.org.id,
                recipient_id=recipient_id,
                type=NotificationType.STATUS_CHANGED,
                entity_type="task",
                entity_id=task.id,
                actor_id=ctx.user.id,
                title=f"{identifier} is {_status_label(task.status)}",
                snippet=f"{task.title} — was {_status_label(previous)}",
                identifier=identifier,
                allow_self=True,
            )
    except Exception:
        logger.exception("Failed to emit status notification for task {}", task.id)


def _status_label(status: TaskStatus) -> str:
    return status.value.replace("_", " ").title()


async def _post_regression_comment(
    session: AsyncSession,
    ctx: OrgContext,
    task: Task,
    previous: TaskStatus,
    status: TaskStatus,
) -> None:
    """Auto-comment when a work item moves backward through the workflow."""
    session.add(
        Comment(
            org_id=ctx.org.id,
            entity_type=CommentEntityType.TASK,
            entity_id=task.id,
            author_id=ctx.user.id,
            content=(
                f"↩︎ Status moved back from **{_status_label(previous)}** "
                f"to **{_status_label(status)}**."
            ),
        )
    )
    await session.flush()


async def transition_status(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, status: TaskStatus
) -> tuple[Task, Project]:
    """Move a task to a new status, recording the transition."""
    task, project = await get_task_with_project(session, ctx, task_id)
    _require_not_archived(project)
    previous = task.status
    if previous == status:
        raise BadRequestError("Task is already in this status")
    previous_workflow_status_id = task.workflow_status_id
    next_workflow_status_id = await resolve_workflow_status_id(
        session, org_id=ctx.org.id, team_id=project.team_id, status=status
    )
    if not await is_transition_allowed(
        session,
        org_id=ctx.org.id,
        from_status_id=previous_workflow_status_id,
        to_status_id=next_workflow_status_id,
        kind=task.kind,
    ):
        raise ForbiddenError("This status transition is not allowed by the project's workflow")
    gate_role = await transition_required_role(
        session,
        org_id=ctx.org.id,
        from_status_id=previous_workflow_status_id,
        to_status_id=next_workflow_status_id,
    )
    if gate_role is not None:
        await require_project_role(session, ctx, project.id, gate_role)
    unmet = await evaluate_transition_conditions(
        session,
        org_id=ctx.org.id,
        task=task,
        from_status_id=previous_workflow_status_id,
        to_status_id=next_workflow_status_id,
    )
    if unmet is not None:
        raise BadRequestError(f"Cannot move to this status: {unmet}.")
    is_backward = (
        STATUS_TO_CATEGORY[status] is not StatusCategory.CANCELLED
        and CATEGORY_RANK[STATUS_TO_CATEGORY[status]] < CATEGORY_RANK[STATUS_TO_CATEGORY[previous]]
    )
    if is_backward and ctx.org.block_backward_transitions:
        raise ForbiddenError("Moving a work item backward is disabled in this workspace")
    task.status = status
    task.workflow_status_id = next_workflow_status_id
    if is_backward:
        await _post_regression_comment(session, ctx, task, previous, status)
    if not _within_creation_grace(task):
        await record_activity(
            session,
            org_id=ctx.org.id,
            entity_type="task",
            entity_id=task.id,
            event_type="status_changed",
            actor_id=ctx.user.id,
            project_id=task.project_id,
            payload={"from": previous, "to": status},
        )
    await session.flush()
    if not _within_creation_grace(task):
        await _emit_status_changed(session, ctx, task, project, previous)
    if status == TaskStatus.DONE and task.source_meeting_id is not None:
        await _close_meeting_loop(session, ctx, task, project)
    await run_trigger(session, ctx, task, AutomationTrigger.ON_STATUS_CHANGE)
    return task, project


async def _close_meeting_loop(
    session: AsyncSession, ctx: OrgContext, task: Task, project: Project
) -> None:
    """Record a done meeting-derived task back on the meeting and notify attendees."""
    meeting_id = task.source_meeting_id
    if meeting_id is None:
        return
    identifier = f"{project.key}-{task.number}"
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting_id,
        event_type="action_item_done",
        actor_id=ctx.user.id,
        payload={"task_id": str(task.id), "identifier": identifier, "title": task.title},
    )
    attendee_rows = await session.execute(
        select(meeting_attendees.c.user_id).where(meeting_attendees.c.meeting_id == meeting_id)
    )
    recipients = {row[0] for row in attendee_rows}
    recipients.discard(ctx.user.id)
    for recipient_id in recipients:
        try:
            await notify(
                session,
                org_id=ctx.org.id,
                recipient_id=recipient_id,
                type=NotificationType.MEETING_ACTION_DONE,
                entity_type="meeting",
                entity_id=meeting_id,
                actor_id=ctx.user.id,
                title=f"{identifier} from your meeting is done",
                snippet=task.title,
            )
        except Exception:
            logger.exception("Failed to emit meeting-loop notification for task {}", task.id)


def _snapshot_description(session: AsyncSession, ctx: OrgContext, task: Task) -> None:
    """Capture the task's current (pre-edit) description as a version, if any (COS-148)."""
    if task.description:
        session.add(
            TaskDescriptionVersion(
                org_id=ctx.org.id,
                task_id=task.id,
                description=task.description,
                edited_by=ctx.user.id,
            )
        )


async def task_transitions(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> dict[str, object]:
    """Status-transition history with per-transition + current-state durations (COS-153)."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    events = list(
        await session.scalars(
            select(ActivityEvent)
            .where(
                ActivityEvent.org_id == ctx.org.id,
                ActivityEvent.entity_type == "task",
                ActivityEvent.entity_id == task_id,
                ActivityEvent.event_type == "status_changed",
            )
            .order_by(ActivityEvent.created_at)
        )
    )
    transitions: list[dict[str, object]] = []
    prev_at = task.created_at
    for event in events:
        payload = event.payload or {}
        transitions.append(
            {
                "from_status": payload.get("from"),
                "to_status": payload.get("to"),
                "at": event.created_at.isoformat(),
                "actor_id": str(event.actor_id) if event.actor_id else None,
                "seconds_in_prev": max(0, int((event.created_at - prev_at).total_seconds())),
            }
        )
        prev_at = event.created_at
    seconds_in_current = max(0, int((utcnow() - prev_at).total_seconds()))
    return {
        "current_status": task.status.value,
        "seconds_in_current": seconds_in_current,
        "transitions": transitions,
    }


async def list_description_versions(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[TaskDescriptionVersion]:
    """List a task's description-edit history, newest first (COS-148)."""
    await get_task_with_project(session, ctx, task_id)
    result = await session.scalars(
        select(TaskDescriptionVersion)
        .where(
            TaskDescriptionVersion.org_id == ctx.org.id,
            TaskDescriptionVersion.task_id == task_id,
        )
        .order_by(TaskDescriptionVersion.created_at.desc())
    )
    return list(result)


async def restore_description_version(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, version_id: uuid.UUID
) -> tuple[Task, Project]:
    """Non-destructively restore a task's description to a prior version (COS-148)."""
    task, project = await get_task_with_project(session, ctx, task_id)
    _require_not_archived(project)
    version = await session.scalar(
        select(TaskDescriptionVersion).where(
            TaskDescriptionVersion.id == version_id,
            TaskDescriptionVersion.task_id == task_id,
            TaskDescriptionVersion.org_id == ctx.org.id,
        )
    )
    if version is None:
        raise NotFoundError("Description version not found")
    _snapshot_description(session, ctx, task)
    task.description = version.description
    await session.flush()
    return task, project


async def delete_task(session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID) -> None:
    """Delete a task."""
    task, project = await get_task_with_project(session, ctx, task_id)
    _require_not_archived(project)
    identifier = f"{project.key}-{task.number}"
    # Recorded before the delete so the id is still readable, and in the same
    # transaction so a rollback takes the tombstone with it.
    sync_service.record_deletion(session, ctx, entity_type="tasks", entity_id=task.id)
    await session.delete(task)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=task_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        project_id=task.project_id,
        payload={"identifier": identifier},
    )
    await session.flush()


async def list_subtasks(
    session: AsyncSession, ctx: OrgContext, parent_id: uuid.UUID
) -> tuple[list[Task], Project]:
    """List the sub-tasks of a parent task."""
    parent, project = await get_task_with_project(session, ctx, parent_id)
    result = await session.scalars(
        select(Task)
        .options(selectinload(Task.labels))
        .where(Task.parent_task_id == parent.id)
        .order_by(Task.sort_order, Task.number)
    )
    return list(result), project


async def _auto_subscribe(
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


async def set_task_subscription(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, *, subscribed: bool
) -> bool:
    """Subscribe or unsubscribe the current user to a task. Returns the new state."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    existing = await session.scalar(
        select(TaskSubscription).where(
            TaskSubscription.task_id == task.id, TaskSubscription.user_id == ctx.user.id
        )
    )
    if subscribed and existing is None:
        session.add(TaskSubscription(org_id=ctx.org.id, task_id=task.id, user_id=ctx.user.id))
    elif not subscribed and existing is not None:
        await session.delete(existing)
    await session.flush()
    return subscribed


async def list_watched_task_ids(session: AsyncSession, ctx: OrgContext) -> set[uuid.UUID]:
    """Return the set of task ids the current user is subscribed to."""
    rows = await session.scalars(
        select(TaskSubscription.task_id).where(
            TaskSubscription.org_id == ctx.org.id, TaskSubscription.user_id == ctx.user.id
        )
    )
    return set(rows)


_RELATION_FORWARD: dict[str, TaskRelationType] = {
    "blocks": TaskRelationType.BLOCKS,
    "blocked_by": TaskRelationType.BLOCKS,
    "related": TaskRelationType.RELATED,
    "duplicate": TaskRelationType.DUPLICATE,
    "duplicates": TaskRelationType.DUPLICATE,
    "duplicate_of": TaskRelationType.DUPLICATE,
    "implements": TaskRelationType.IMPLEMENTS,
    "implemented_by": TaskRelationType.IMPLEMENTS,
}
_RELATION_INVERSE: frozenset[str] = frozenset({"blocked_by", "duplicate_of", "implemented_by"})


def _normalize_relation(
    source_id: uuid.UUID, target_id: uuid.UUID, relation_type: str
) -> tuple[uuid.UUID, uuid.UUID, TaskRelationType]:
    """Map a user-facing relation onto a stored canonical direction (inverses are flipped)."""
    key = str(relation_type)
    stored = _RELATION_FORWARD.get(key)
    if stored is None:
        raise BadRequestError("Unknown relation type")
    if key in _RELATION_INVERSE:
        return target_id, source_id, stored
    return source_id, target_id, stored


def _relation_kind(relation_type: TaskRelationType, is_source: bool) -> str:
    """Render the perspective-aware relation kind for a task's relations list."""
    if relation_type == TaskRelationType.BLOCKS:
        return "blocks" if is_source else "blocked_by"
    if relation_type == TaskRelationType.DUPLICATE:
        return "duplicate" if is_source else "duplicate_of"
    if relation_type == TaskRelationType.IMPLEMENTS:
        return "implements" if is_source else "implemented_by"
    return "related"


async def create_relation(
    session: AsyncSession,
    ctx: OrgContext,
    task_id: uuid.UUID,
    target_task_id: uuid.UUID,
    relation_type: str,
    custom_type_id: uuid.UUID | None = None,
) -> TaskRelation:
    """Create a directed relation between two tasks, normalized to a canonical direction.

    A custom_type_id stores a workspace-defined directional type (source uses the
    outward label, target the inward); the source→target direction is preserved.
    """
    task, _ = await get_task_with_project(session, ctx, task_id)
    if target_task_id == task.id:
        raise BadRequestError("A task cannot relate to itself")
    target = await session.scalar(
        select(Task).where(Task.id == target_task_id, Task.org_id == ctx.org.id)
    )
    if target is None:
        raise BadRequestError("Related task not found")
    if custom_type_id is not None:
        valid = await session.scalar(
            select(RelationTypeDef.id).where(
                RelationTypeDef.id == custom_type_id, RelationTypeDef.org_id == ctx.org.id
            )
        )
        if valid is None:
            raise BadRequestError("Unknown relation type")
        source_id, dest_id, stored_type = task.id, target.id, TaskRelationType.CUSTOM
    else:
        source_id, dest_id, stored_type = _normalize_relation(task.id, target.id, relation_type)
    existing = await session.scalar(
        select(TaskRelation).where(
            TaskRelation.source_task_id == source_id,
            TaskRelation.target_task_id == dest_id,
            TaskRelation.type == stored_type,
            TaskRelation.custom_type_id == custom_type_id,
        )
    )
    if existing is not None:
        raise ConflictError("This relation already exists")
    relation = TaskRelation(
        org_id=ctx.org.id,
        source_task_id=source_id,
        target_task_id=dest_id,
        type=stored_type,
        custom_type_id=custom_type_id,
        created_by=ctx.user.id,
    )
    session.add(relation)
    await session.flush()
    return relation


async def add_relations_bulk(
    session: AsyncSession,
    ctx: OrgContext,
    task_id: uuid.UUID,
    target_task_ids: list[uuid.UUID],
    relation_type: str,
) -> list[dict[str, object]]:
    """Relate one task to many targets; per-target created / exists / skipped.

    A duplicate relation reports ``exists``; a self-link or unknown target reports
    ``skipped`` — neither aborts the batch (all checks run before any DB insert).
    """
    results: list[dict[str, object]] = []
    seen: set[uuid.UUID] = set()
    for target_id in target_task_ids:
        if target_id in seen:
            results.append({"target_task_id": target_id, "status": "skipped"})
            continue
        seen.add(target_id)
        try:
            await create_relation(session, ctx, task_id, target_id, relation_type)
            results.append({"target_task_id": target_id, "status": "created"})
        except ConflictError:
            results.append({"target_task_id": target_id, "status": "exists"})
        except BadRequestError:
            results.append({"target_task_id": target_id, "status": "skipped"})
    return results


async def list_relations(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[dict[str, object]]:
    """List relations from the perspective of a task, deriving blocked_by from inverse BLOCKS."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    rows = await session.scalars(
        select(TaskRelation).where(
            or_(
                TaskRelation.source_task_id == task.id,
                TaskRelation.target_task_id == task.id,
            )
        )
    )
    relations = list(rows)
    other_ids: set[uuid.UUID] = set()
    for relation in relations:
        other_ids.add(relation.target_task_id)
        other_ids.add(relation.source_task_id)
    other_ids.discard(task.id)
    others = await _load_task_identifiers(session, ctx, other_ids)
    custom_ids = {r.custom_type_id for r in relations if r.custom_type_id is not None}
    defs: dict[uuid.UUID, tuple[str, str]] = {}
    if custom_ids:
        for row in await session.scalars(
            select(RelationTypeDef).where(RelationTypeDef.id.in_(custom_ids))
        ):
            defs[row.id] = (row.outward_label, row.inward_label)
    result: list[dict[str, object]] = []
    for relation in relations:
        is_source = relation.source_task_id == task.id
        other_id = relation.target_task_id if is_source else relation.source_task_id
        if relation.type is TaskRelationType.CUSTOM and relation.custom_type_id in defs:
            outward, inward = defs[relation.custom_type_id]
            kind = outward if is_source else inward
        else:
            kind = _relation_kind(relation.type, is_source)
        meta = others.get(other_id)
        if meta is None:
            continue
        result.append(
            {
                "relation_id": relation.id,
                "task_id": other_id,
                "identifier": meta[0],
                "title": meta[1],
                "status": meta[2],
                "due_date": meta[3],
                "type": kind,
            }
        )
    return result


async def list_relations_grouped(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> dict[str, list[dict[str, object]]]:
    """List a task's relations bucketed by perspective-aware kind (blocks, related, …)."""
    grouped: dict[str, list[dict[str, object]]] = {}
    for relation in await list_relations(session, ctx, task_id):
        grouped.setdefault(str(relation["type"]), []).append(relation)
    return grouped


_OPEN_TASK_STATUSES = tuple(
    s for s in TaskStatus if s not in (TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.DUPLICATE)
)


async def find_duplicate_candidates(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    *,
    title: str,
    description: str | None = None,
    exclude_task_id: uuid.UUID | None = None,
    limit: int = 5,
) -> list[dict[str, object]]:
    """Token-overlap similar open tasks in a project, suppressing dismissed pairs (COS-242)."""
    await _require_project_access(session, ctx, project_id)
    query_tokens = content_tokens(title, description)
    if not query_tokens:
        return []
    suppressed: set[uuid.UUID] = set()
    if exclude_task_id is not None:
        rows = await session.execute(
            select(NotDuplicatePair.task_a_id, NotDuplicatePair.task_b_id).where(
                NotDuplicatePair.org_id == ctx.org.id,
                or_(
                    NotDuplicatePair.task_a_id == exclude_task_id,
                    NotDuplicatePair.task_b_id == exclude_task_id,
                ),
            )
        )
        for a, b in rows:
            suppressed.add(a)
            suppressed.add(b)
    candidates = list(
        await session.scalars(
            select(Task).where(
                Task.org_id == ctx.org.id,
                Task.project_id == project_id,
                Task.archived_at.is_(None),
                Task.status.in_(_OPEN_TASK_STATUSES),
            )
        )
    )
    scored: list[tuple[int, dict[str, object]]] = []
    for task in candidates:
        if task.id == exclude_task_id or task.id in suppressed:
            continue
        task_tokens = content_tokens(task.title, task.description)
        overlap = token_overlap(query_tokens, task_tokens)
        if overlap < MIN_DUPLICATE_TOKEN_OVERLAP:
            continue
        union = len(query_tokens | task_tokens) or 1
        scored.append(
            (
                overlap,
                {
                    "task_id": str(task.id),
                    "title": task.title,
                    "status": task.status.value,
                    "score": round(overlap / union, 3),
                    "shared_tokens": overlap,
                },
            )
        )
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [entry for _, entry in scored[:limit]]


async def mark_not_duplicate(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, other_id: uuid.UUID
) -> None:
    """Record two tasks as not-duplicates, suppressing future suggestions (COS-242)."""
    await get_task_with_project(session, ctx, task_id)
    a, b = sorted([task_id, other_id], key=str)
    exists = await session.scalar(
        select(NotDuplicatePair.id).where(
            NotDuplicatePair.org_id == ctx.org.id,
            NotDuplicatePair.task_a_id == a,
            NotDuplicatePair.task_b_id == b,
        )
    )
    if exists is None:
        session.add(NotDuplicatePair(org_id=ctx.org.id, task_a_id=a, task_b_id=b))
        await session.flush()


async def list_relation_types(ctx: OrgContext, session: AsyncSession) -> list[RelationTypeDef]:
    """List the org's custom relation type definitions (COS-53)."""
    result = await session.scalars(
        select(RelationTypeDef)
        .where(RelationTypeDef.org_id == ctx.org.id)
        .order_by(RelationTypeDef.name)
    )
    return list(result)


async def create_relation_type(
    session: AsyncSession, ctx: OrgContext, *, name: str, outward_label: str, inward_label: str
) -> RelationTypeDef:
    clash = await session.scalar(
        select(RelationTypeDef.id).where(
            RelationTypeDef.org_id == ctx.org.id, RelationTypeDef.name == name
        )
    )
    if clash is not None:
        raise ConflictError("A relation type with this name already exists")
    definition = RelationTypeDef(
        org_id=ctx.org.id, name=name, outward_label=outward_label, inward_label=inward_label
    )
    session.add(definition)
    await session.flush()
    return definition


async def delete_relation_type(session: AsyncSession, ctx: OrgContext, type_id: uuid.UUID) -> None:
    definition = await session.scalar(
        select(RelationTypeDef).where(
            RelationTypeDef.id == type_id, RelationTypeDef.org_id == ctx.org.id
        )
    )
    if definition is None:
        raise NotFoundError("Relation type not found")
    await session.delete(definition)
    await session.flush()


async def _load_task_identifiers(
    session: AsyncSession, ctx: OrgContext, task_ids: set[uuid.UUID]
) -> dict[uuid.UUID, tuple[str, str, TaskStatus, date | None]]:
    if not task_ids:
        return {}
    rows = await session.execute(
        select(Task.id, Project.key, Task.number, Task.title, Task.status, Task.due_date)
        .join(Project, Project.id == Task.project_id)
        .where(Task.id.in_(task_ids), Task.org_id == ctx.org.id)
    )
    return {row[0]: (f"{row[1]}-{row[2]}", row[3], row[4], row[5]) for row in rows}


async def delete_relation(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, relation_id: uuid.UUID
) -> None:
    """Delete a relation touching the given task."""
    await get_task_with_project(session, ctx, task_id)
    relation = await session.scalar(
        select(TaskRelation).where(
            TaskRelation.id == relation_id, TaskRelation.org_id == ctx.org.id
        )
    )
    if relation is None:
        raise NotFoundError("Relation not found")
    if task_id not in (relation.source_task_id, relation.target_task_id):
        raise BadRequestError("Relation does not involve this task")
    await session.delete(relation)
    await session.flush()


async def add_task_link(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, payload: TaskLinkIn
) -> TaskLink:
    """Attach an external link to a task within the org."""
    await get_task(session, ctx, task_id)
    link = TaskLink(
        org_id=ctx.org.id,
        task_id=task_id,
        url=payload.url,
        title=payload.title,
        created_by=ctx.user.id,
    )
    session.add(link)
    await session.flush()
    return link


async def list_task_links(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[TaskLink]:
    """List a task's links (newest first)."""
    await get_task(session, ctx, task_id)
    result = await session.scalars(
        select(TaskLink)
        .where(TaskLink.task_id == task_id, TaskLink.org_id == ctx.org.id)
        .order_by(TaskLink.created_at.desc())
    )
    return list(result)


async def delete_task_link(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, link_id: uuid.UUID
) -> None:
    """Delete a link from a task."""
    await get_task(session, ctx, task_id)
    link = await session.scalar(
        select(TaskLink).where(
            TaskLink.id == link_id, TaskLink.task_id == task_id, TaskLink.org_id == ctx.org.id
        )
    )
    if link is None:
        raise NotFoundError("Link not found")
    await session.delete(link)
    await session.flush()


async def link_note(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, note_id: uuid.UUID
) -> None:
    """Link a note/page to a task (idempotent, same org)."""
    await get_task(session, ctx, task_id)
    note = await session.scalar(
        select(Note.id).where(Note.id == note_id, Note.org_id == ctx.org.id)
    )
    if note is None:
        raise NotFoundError("Note not found")
    existing = await session.scalar(
        select(TaskNoteLink.id).where(
            TaskNoteLink.task_id == task_id, TaskNoteLink.note_id == note_id
        )
    )
    if existing is not None:
        return
    session.add(TaskNoteLink(org_id=ctx.org.id, task_id=task_id, note_id=note_id))
    await session.flush()


async def list_tasks_for_note(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID
) -> list[tuple[Task, str]]:
    """Work items created from or linked to a page (COS-144): source_note_id OR a TaskNoteLink."""
    linked_ids = set(
        await session.scalars(
            select(TaskNoteLink.task_id).where(
                TaskNoteLink.note_id == note_id, TaskNoteLink.org_id == ctx.org.id
            )
        )
    )
    conditions = [Task.source_note_id == note_id]
    if linked_ids:
        conditions.append(Task.id.in_(linked_ids))
    rows = await session.execute(
        select(Task, Project.key)
        .join(Project, Project.id == Task.project_id)
        .where(Task.org_id == ctx.org.id, or_(*conditions))
        .order_by(Task.created_at.desc())
    )
    return [(task, key) for task, key in rows]


async def list_note_links(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[tuple[uuid.UUID, str, uuid.UUID | None]]:
    """Return (note_id, title, project_id) for notes linked to a task."""
    await get_task(session, ctx, task_id)
    rows = await session.execute(
        select(Note.id, Note.title, Note.project_id)
        .join(TaskNoteLink, TaskNoteLink.note_id == Note.id)
        .where(TaskNoteLink.task_id == task_id, TaskNoteLink.org_id == ctx.org.id)
        .order_by(Note.title)
    )
    return [(row[0], row[1], row[2]) for row in rows]


async def unlink_note(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID, note_id: uuid.UUID
) -> None:
    """Remove a note link from a task."""
    await get_task(session, ctx, task_id)
    link = await session.scalar(
        select(TaskNoteLink).where(
            TaskNoteLink.task_id == task_id,
            TaskNoteLink.note_id == note_id,
            TaskNoteLink.org_id == ctx.org.id,
        )
    )
    if link is None:
        raise NotFoundError("Note link not found")
    await session.delete(link)
    await session.flush()


async def list_subscribers(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[uuid.UUID]:
    """Return the user ids subscribed to a task (the watcher roster)."""
    await get_task(session, ctx, task_id)
    rows = await session.scalars(
        select(TaskSubscription.user_id).where(
            TaskSubscription.task_id == task_id, TaskSubscription.org_id == ctx.org.id
        )
    )
    return list(rows)


async def _project_in_org(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    row = await session.scalar(
        select(Project.id).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if row is None:
        raise NotFoundError("Project not found")


async def create_template(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: WorkItemTemplateCreateIn
) -> WorkItemTemplate:
    """Define a reusable work-item template for a project."""
    await _project_in_org(session, ctx, project_id)
    template = WorkItemTemplate(
        org_id=ctx.org.id,
        project_id=project_id,
        name=payload.name,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        kind=payload.kind,
    )
    session.add(template)
    await session.flush()
    return template


async def list_templates(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[WorkItemTemplate]:
    """List a project's work-item templates."""
    await _project_in_org(session, ctx, project_id)
    result = await session.scalars(
        select(WorkItemTemplate)
        .where(WorkItemTemplate.project_id == project_id, WorkItemTemplate.org_id == ctx.org.id)
        .order_by(WorkItemTemplate.name)
    )
    return list(result)


async def delete_template(session: AsyncSession, ctx: OrgContext, template_id: uuid.UUID) -> None:
    """Delete a work-item template."""
    template = await session.scalar(
        select(WorkItemTemplate).where(
            WorkItemTemplate.id == template_id, WorkItemTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Template not found")
    await session.delete(template)
    await session.flush()


async def create_work_item_update(
    session: AsyncSession,
    ctx: OrgContext,
    task_id: uuid.UUID,
    payload: WorkItemUpdateCreateIn,
) -> WorkItemUpdate:
    """Post a RAG health + summary progress update on a work item."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    update = WorkItemUpdate(
        org_id=ctx.org.id,
        task_id=task.id,
        health=payload.health,
        summary=payload.summary,
        created_by=ctx.user.id,
    )
    session.add(update)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="task",
        entity_id=task.id,
        event_type="task.update_posted",
        actor_id=ctx.user.id,
        payload={"health": payload.health},
    )
    return update


async def list_work_item_updates(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[WorkItemUpdate]:
    """List a work item's progress updates, newest first."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    result = await session.scalars(
        select(WorkItemUpdate)
        .where(WorkItemUpdate.task_id == task.id)
        .order_by(WorkItemUpdate.created_at.desc())
    )
    return list(result)


async def throughput_trend(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, days: int = 30
) -> list[dict[str, object]]:
    """Per-day created vs resolved counts for a project over the last ``days`` days.

    Created is counted from the task's creation date; resolved is counted from
    accurate status_changed→done activity events (not approximate timestamps).
    """
    await _project_in_org(session, ctx, project_id)
    start = (utcnow() - timedelta(days=days - 1)).date()

    created_rows = await session.execute(
        select(func.date(Task.created_at), func.count())
        .where(Task.project_id == project_id, func.date(Task.created_at) >= start)
        .group_by(func.date(Task.created_at))
    )
    created = {row[0]: row[1] for row in created_rows}

    resolved_rows = await session.execute(
        select(func.date(ActivityEvent.created_at), func.count())
        .where(
            ActivityEvent.project_id == project_id,
            ActivityEvent.entity_type == "task",
            ActivityEvent.event_type == "status_changed",
            ActivityEvent.payload["to"].astext == TaskStatus.DONE.value,
            func.date(ActivityEvent.created_at) >= start,
        )
        .group_by(func.date(ActivityEvent.created_at))
    )
    resolved = {row[0]: row[1] for row in resolved_rows}

    return [
        {
            "date": (day := start + timedelta(days=offset)).isoformat(),
            "created": created.get(day, 0),
            "resolved": resolved.get(day, 0),
        }
        for offset in range(days)
    ]


async def list_schedule_links(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[dict[str, object]]:
    """Scheduling dependencies touching a task, from its perspective (COS-68)."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    rows = list(
        await session.scalars(
            select(TaskScheduleLink).where(
                or_(
                    TaskScheduleLink.predecessor_id == task.id,
                    TaskScheduleLink.successor_id == task.id,
                )
            )
        )
    )
    other_ids = {r.predecessor_id for r in rows} | {r.successor_id for r in rows}
    other_ids.discard(task.id)
    others = await _load_task_identifiers(session, ctx, other_ids)
    result: list[dict[str, object]] = []
    for link in rows:
        is_predecessor = link.predecessor_id == task.id
        other_id = link.successor_id if is_predecessor else link.predecessor_id
        meta = others.get(other_id)
        if meta is None:
            continue
        result.append(
            {
                "link_id": link.id,
                "task_id": other_id,
                "identifier": meta[0],
                "title": meta[1],
                "status": meta[2],
                "due_date": meta[3],
                "dependency_type": link.dependency_type.value,
                "direction": "successor" if is_predecessor else "predecessor",
            }
        )
    return result


async def create_schedule_link(
    session: AsyncSession,
    ctx: OrgContext,
    task_id: uuid.UUID,
    *,
    other_task_id: uuid.UUID,
    dependency_type: "ScheduleDependencyType",
    other_is_predecessor: bool,
) -> TaskScheduleLink:
    """Create a scheduling dependency; the path task is the successor by default."""
    task, _ = await get_task_with_project(session, ctx, task_id)
    if other_task_id == task.id:
        raise BadRequestError("A task cannot depend on itself")
    other = await session.scalar(
        select(Task).where(Task.id == other_task_id, Task.org_id == ctx.org.id)
    )
    if other is None:
        raise BadRequestError("Linked task not found")
    predecessor_id, successor_id = (
        (other.id, task.id) if other_is_predecessor else (task.id, other.id)
    )
    existing = await session.scalar(
        select(TaskScheduleLink.id).where(
            TaskScheduleLink.predecessor_id == predecessor_id,
            TaskScheduleLink.successor_id == successor_id,
            TaskScheduleLink.dependency_type == dependency_type,
        )
    )
    if existing is not None:
        raise ConflictError("This scheduling dependency already exists")
    link = TaskScheduleLink(
        org_id=ctx.org.id,
        predecessor_id=predecessor_id,
        successor_id=successor_id,
        dependency_type=dependency_type,
        created_by=ctx.user.id,
    )
    session.add(link)
    await session.flush()
    return link


async def delete_schedule_link(session: AsyncSession, ctx: OrgContext, link_id: uuid.UUID) -> None:
    link = await session.scalar(
        select(TaskScheduleLink).where(
            TaskScheduleLink.id == link_id, TaskScheduleLink.org_id == ctx.org.id
        )
    )
    if link is None:
        raise NotFoundError("Scheduling dependency not found")
    await session.delete(link)
    await session.flush()
