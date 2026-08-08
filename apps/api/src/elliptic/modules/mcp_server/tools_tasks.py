"""Task read/write tools at parity with the web task surface (beyond the Linear ceiling)."""

import uuid
from datetime import date
from typing import Any, cast

from mcp.types import ToolAnnotations

from elliptic.core.pagination import PageParams
from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.tasks import service as tasks_service
from elliptic.modules.tasks.models import BugSeverity, TaskKind, TaskPriority, TaskStatus
from elliptic.modules.tasks.schemas import (
    BoardColumn,
    LabelCreateIn,
    LabelOut,
    RelatedTaskOut,
    TaskBatchCreateIn,
    TaskCreateIn,
    TaskUpdateIn,
)


def _opt_uuid(value: str | None) -> uuid.UUID | None:
    return uuid.UUID(value) if value else None


def _opt_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


@mcp.tool
async def list_project_tasks(
    project_id: str,
    status: str | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    org_id: str | None = None,
) -> dict[str, Any]:
    """List a project's tasks; filters mirror the board (status, assignee, text search).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        tasks, project, total = await tasks_service.list_tasks(
            call.session,
            call.ctx,
            uuid.UUID(project_id),
            PageParams(limit=limit, offset=offset),
            status=TaskStatus(status) if status else None,
            assignee_id=_opt_uuid(assignee_id),
            label_id=None,
            search=search,
        )
        items = await tasks_service.serialize_tasks(call.session, tasks, project.key)
        return {"total": total, "items": [item.model_dump(mode="json") for item in items]}


@mcp.tool
async def get_task(task_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch one task by id, with its display identifier, counts, and blocked state.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        task, project = await tasks_service.get_task_with_project(
            call.session, call.ctx, uuid.UUID(task_id)
        )
        serialized = await tasks_service.serialize_task(call.session, task, project.key)
        return serialized.model_dump(mode="json")


@mcp.tool
async def create_task(
    project_id: str,
    title: str,
    description: str | None = None,
    status: str = "backlog",
    priority: str = "none",
    assignee_id: str | None = None,
    unassigned: bool = False,
    start_date: str | None = None,
    due_date: str | None = None,
    label_ids: list[str] | None = None,
    parent_task_id: str | None = None,
    source_meeting_id: str | None = None,
    source_note_id: str | None = None,
    kind: str = "task",
    severity: str | None = None,
    component: str | None = None,
    release_blocker: bool = False,
    is_triage: bool = False,
    mention_user_ids: list[str] | None = None,
    related_task_ids: list[str] | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create a task; inherits Linear numbering, project gates, automations, and activity.

    Without an assignee_id the task falls to the project's default assignee, or to
    the caller; pass unassigned=True to leave it with nobody assigned.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = TaskCreateIn(
                title=title,
                description=description,
                status=TaskStatus(status),
                priority=TaskPriority(priority),
                assignee_id=_opt_uuid(assignee_id),
                unassigned=unassigned,
                start_date=_opt_date(start_date),
                due_date=_opt_date(due_date),
                label_ids=[uuid.UUID(value) for value in (label_ids or [])],
                parent_task_id=_opt_uuid(parent_task_id),
                source_meeting_id=_opt_uuid(source_meeting_id),
                source_note_id=_opt_uuid(source_note_id),
                kind=TaskKind(kind),
                severity=BugSeverity(severity) if severity else None,
                component=component,
                release_blocker=release_blocker,
                is_triage=is_triage,
                mention_user_ids=[uuid.UUID(value) for value in (mention_user_ids or [])],
                related_task_ids=[uuid.UUID(value) for value in (related_task_ids or [])],
            )
            task, project = await tasks_service.create_task(
                call.session, call.ctx, uuid.UUID(project_id), payload
            )
            serialized = await tasks_service.serialize_task(call.session, task, project.key)
            return serialized.model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_task",
            producer=_produce,
        )


@mcp.tool
async def update_task(
    task_id: str,
    title: str | None = None,
    description: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    clear_assignee: bool = False,
    start_date: str | None = None,
    due_date: str | None = None,
    estimate: str | None = None,
    acceptance_criteria: str | None = None,
    label_ids: list[str] | None = None,
    kind: str | None = None,
    severity: str | None = None,
    clear_severity: bool = False,
    component: str | None = None,
    clear_component: bool = False,
    release_blocker: bool | None = None,
    mention_user_ids: list[str] | None = None,
    related_task_ids: list[str] | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Update a task's fields. Every argument you omit is left untouched.

    Covers the planning fields as well as the basics: start and due dates, an
    estimate, acceptance criteria, the affected component, and whether the task
    blocks a release. Clearing a value needs its explicit flag — clear_assignee,
    clear_severity, clear_component — because an omitted argument and an explicit
    null arrive identically over the tool boundary.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        payload = TaskUpdateIn(
            title=title,
            description=description,
            priority=TaskPriority(priority) if priority else None,
            assignee_id=_opt_uuid(assignee_id),
            clear_assignee=clear_assignee,
            start_date=_opt_date(start_date),
            due_date=_opt_date(due_date),
            estimate=estimate,
            acceptance_criteria=acceptance_criteria,
            label_ids=[uuid.UUID(value) for value in label_ids] if label_ids is not None else None,
            kind=TaskKind(kind) if kind else None,
            severity=BugSeverity(severity) if severity else None,
            clear_severity=clear_severity,
            component=component,
            clear_component=clear_component,
            release_blocker=release_blocker,
            mention_user_ids=[uuid.UUID(value) for value in (mention_user_ids or [])],
            related_task_ids=[uuid.UUID(value) for value in (related_task_ids or [])],
        )
        task, project = await tasks_service.update_task(
            call.session, call.ctx, uuid.UUID(task_id), payload
        )
        serialized = await tasks_service.serialize_task(call.session, task, project.key)
        return serialized.model_dump(mode="json")


@mcp.tool
async def transition_task_status(
    task_id: str, status: str, org_id: str | None = None
) -> dict[str, Any]:
    """Move a task to a new workflow status (runs the meeting-loop closure and activity).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        task, project = await tasks_service.transition_status(
            call.session, call.ctx, uuid.UUID(task_id), TaskStatus(status)
        )
        serialized = await tasks_service.serialize_task(call.session, task, project.key)
        return serialized.model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_task(
    task_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete a task. Call with confirm=false to preview, then confirm=true to delete.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        task, project = await tasks_service.get_task_with_project(
            call.session, call.ctx, uuid.UUID(task_id)
        )
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_task",
                "identifier": f"{project.key}-{task.number}",
                "title": task.title,
                "hint": "Re-call delete_task with confirm=true to permanently delete.",
            }
        await tasks_service.delete_task(call.session, call.ctx, uuid.UUID(task_id))
        return {"deleted": True, "task_id": task_id}


@mcp.tool
async def list_labels(org_id: str | None = None) -> dict[str, Any]:
    """List the organization's task labels (tags), each with its id, name and display color.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        labels = await tasks_service.list_labels(call.session, call.ctx)
        items = [LabelOut.model_validate(label).model_dump(mode="json") for label in labels]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_label(
    name: str, color: str = "#808080", org_id: str | None = None
) -> dict[str, Any]:
    """Create an org-scoped task label (tag). Get-or-create: if a label with this exact name
    already exists it is returned unchanged with created=false, so the call is safe to retry.
    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        for existing in await tasks_service.list_labels(call.session, call.ctx):
            if existing.name == name:
                payload = LabelOut.model_validate(existing).model_dump(mode="json")
                return {**payload, "created": False}
        label = await tasks_service.create_label(
            call.session, call.ctx, LabelCreateIn(name=name, color=color)
        )
        payload = LabelOut.model_validate(label).model_dump(mode="json")
        return {**payload, "created": True}


@mcp.tool
async def attach_task_labels(
    task_id: str, label_ids: list[str], org_id: str | None = None
) -> dict[str, Any]:
    """Attach one or more existing labels to a task. Additive — labels already on the task are
    kept; passing an already-attached label is a no-op.
    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        task, _ = await tasks_service.get_task_with_project(
            call.session, call.ctx, uuid.UUID(task_id)
        )
        merged = {label.id for label in task.labels} | {uuid.UUID(value) for value in label_ids}
        updated, project = await tasks_service.update_task(
            call.session, call.ctx, uuid.UUID(task_id), TaskUpdateIn(label_ids=list(merged))
        )
        serialized = await tasks_service.serialize_task(call.session, updated, project.key)
        return serialized.model_dump(mode="json")


@mcp.tool
async def detach_task_labels(
    task_id: str, label_ids: list[str], org_id: str | None = None
) -> dict[str, Any]:
    """Remove one or more labels from a task. Labels not currently attached are ignored.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        task, _ = await tasks_service.get_task_with_project(
            call.session, call.ctx, uuid.UUID(task_id)
        )
        remaining = {label.id for label in task.labels} - {uuid.UUID(value) for value in label_ids}
        updated, project = await tasks_service.update_task(
            call.session, call.ctx, uuid.UUID(task_id), TaskUpdateIn(label_ids=list(remaining))
        )
        serialized = await tasks_service.serialize_task(call.session, updated, project.key)
        return serialized.model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_label(
    label_id: str, confirm: bool = False, org_id: str | None = None
) -> dict[str, Any]:
    """Delete an org label (tag), removing it from every task. Call with confirm=false to
    preview, then confirm=true to delete.
    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        target = next(
            (
                label
                for label in await tasks_service.list_labels(call.session, call.ctx)
                if str(label.id) == label_id
            ),
            None,
        )
        if target is None:
            return {"deleted": False, "label_id": label_id, "error": "Label not found"}
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_label",
                "label_id": label_id,
                "name": target.name,
                "hint": "Re-call delete_label with confirm=true to permanently delete.",
            }
        await tasks_service.delete_label(call.session, call.ctx, uuid.UUID(label_id))
        return {"deleted": True, "label_id": label_id}


@mcp.tool
async def create_tasks_batch(
    project_id: str,
    titles: list[str],
    source_note_id: str | None = None,
    source_meeting_id: str | None = None,
    idempotency_key: str | None = None,
    org_id: str | None = None,
) -> dict[str, Any]:
    """Create several tasks at once from text lines, sharing source provenance.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:

        async def _produce() -> dict[str, Any]:
            payload = TaskBatchCreateIn(
                titles=titles,
                source_note_id=_opt_uuid(source_note_id),
                source_meeting_id=_opt_uuid(source_meeting_id),
            )
            tasks, project = await tasks_service.batch_create_tasks(
                call.session, call.ctx, uuid.UUID(project_id), payload
            )
            items = await tasks_service.serialize_tasks(call.session, tasks, project.key)
            return {"total": len(items), "items": [item.model_dump(mode="json") for item in items]}

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_tasks_batch",
            producer=_produce,
        )


@mcp.tool
async def get_task_board(project_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Fetch a project's board: all non-triage tasks grouped into status columns.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        columns, project = await tasks_service.board(call.session, call.ctx, uuid.UUID(project_id))
        payload = [
            BoardColumn(
                status=col_status,
                tasks=await tasks_service.serialize_tasks(call.session, tasks, project.key),
            )
            for col_status, tasks in columns.items()
        ]
        return {"columns": [column.model_dump(mode="json") for column in payload]}


@mcp.tool
async def list_my_tasks(
    filter: str = "assigned",  # noqa: A002 — user-facing tool param name
    limit: int = 50,
    offset: int = 0,
    org_id: str | None = None,
) -> dict[str, Any]:
    """List the current user's tasks (filter: assigned, created, subscribed, or recent).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        if filter not in ("assigned", "created", "subscribed", "recent"):
            raise ValueError("filter must be one of: assigned, created, subscribed, recent")
        # The guard above narrows `filter` to the UserTaskScope Literal members at
        # runtime; cast tells mypy what that guard already guarantees.
        scope = cast(tasks_service.UserTaskScope, filter)
        tasks_with_keys, total = await tasks_service.list_user_tasks(
            call.session, call.ctx, scope, PageParams(limit=limit, offset=offset)
        )
        items = await tasks_service.serialize_mixed_tasks(call.session, tasks_with_keys)
        return {"total": total, "items": [item.model_dump(mode="json") for item in items]}


@mcp.tool
async def list_subtasks(task_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List the sub-tasks of a parent task, in board order.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        subtasks, project = await tasks_service.list_subtasks(
            call.session, call.ctx, uuid.UUID(task_id)
        )
        items = await tasks_service.serialize_tasks(call.session, subtasks, project.key)
        return {"total": len(items), "items": [item.model_dump(mode="json") for item in items]}


@mcp.tool
async def subscribe_task(task_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Subscribe the current user to a task to receive its activity notifications.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await tasks_service.set_task_subscription(
            call.session, call.ctx, uuid.UUID(task_id), subscribed=True
        )
        return {"subscribed": True, "task_id": task_id}


@mcp.tool
async def unsubscribe_task(task_id: str, org_id: str | None = None) -> dict[str, Any]:
    """Unsubscribe the current user from a task's activity notifications.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await tasks_service.set_task_subscription(
            call.session, call.ctx, uuid.UUID(task_id), subscribed=False
        )
        return {"subscribed": False, "task_id": task_id}


@mcp.tool
async def list_task_relations(task_id: str, org_id: str | None = None) -> dict[str, Any]:
    """List a task's relations (blocks, blocked_by, related) from its perspective.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:read", org_id=org_id) as call:
        relations = await tasks_service.list_relations(call.session, call.ctx, uuid.UUID(task_id))
        items = [
            RelatedTaskOut.model_validate(relation).model_dump(mode="json")
            for relation in relations
        ]
        return {"total": len(items), "items": items}


@mcp.tool
async def add_task_relation(
    task_id: str,
    target_task_id: str,
    type: str,  # noqa: A002 — user-facing tool param name
    org_id: str | None = None,
) -> dict[str, Any]:
    """Relate a task to another (type: blocks, blocked_by, or related).

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        relation = await tasks_service.create_relation(
            call.session, call.ctx, uuid.UUID(task_id), uuid.UUID(target_task_id), type
        )
        return {"created": True, "relation_id": str(relation.id), "task_id": task_id}


@mcp.tool
async def remove_task_relation(
    task_id: str, relation_id: str, org_id: str | None = None
) -> dict[str, Any]:
    """Remove a relation touching a task.

    Pass org_id to target a specific organization when using a multi-organization token."""
    async with mcp_call("tasks:write", org_id=org_id) as call:
        await tasks_service.delete_relation(
            call.session, call.ctx, uuid.UUID(task_id), uuid.UUID(relation_id)
        )
        return {"deleted": True, "relation_id": relation_id}
