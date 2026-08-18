"""Task, board, and label endpoints."""

import csv
import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from fastapi.responses import Response

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParams, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.properties import service as properties_service
from elliptic.modules.properties.schemas import CustomPropertyOut
from elliptic.modules.tasks import import_service, service, timeline
from elliptic.modules.tasks.models import (
    STATUS_TO_CATEGORY,
    BugSeverity,
    TaskKind,
    TaskPriority,
    TaskStatus,
)
from elliptic.modules.tasks.schemas import (
    AutoShiftOut,
    BoardColumn,
    DuplicateCandidateOut,
    LabelCreateIn,
    LabelOut,
    NoteLinkOut,
    RelatedTaskOut,
    RelationResult,
    RelationTypeDefIn,
    RelationTypeDefOut,
    ScheduleLinkIn,
    ScheduleLinkOut,
    ShiftedTaskOut,
    StatusInfo,
    TaskArchiveIn,
    TaskBatchCreateIn,
    TaskConvertIn,
    TaskCreateIn,
    TaskDescriptionVersionOut,
    TaskDuplicateIn,
    TaskImportIn,
    TaskImportOut,
    TaskLinkIn,
    TaskLinkOut,
    TaskOut,
    TaskRelationBulkIn,
    TaskRelationIn,
    TaskStatusIn,
    TaskTransitionsOut,
    TaskUpdateIn,
    ThroughputPoint,
    TimelineOut,
    WorkItemSchemaOut,
    WorkItemTemplateCreateIn,
    WorkItemTemplateOut,
    WorkItemUpdateCreateIn,
    WorkItemUpdateOut,
)

router = APIRouter(prefix="/orgs/{org_id}", tags=["tasks"])


@router.get("/tasks/{task_id}/git-branch")
async def git_branch_name(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[dict[str, str]]:
    """A suggested git branch name for a task (COS-256)."""
    from elliptic.modules.integrations.git_service import branch_name  # noqa: PLC0415
    from elliptic.modules.tasks.service import get_task_with_project  # noqa: PLC0415

    task, project = await get_task_with_project(session, ctx, task_id)
    return ok({"branch_name": branch_name(project.key, task.number, task.title)})


_EXPORT_CAP = 5000


def _csv_safe(value: str) -> str:
    """Neutralize spreadsheet formula injection in exported cells."""
    return f"'{value}" if value[:1] in ("=", "+", "-", "@") else value


@router.post("/projects/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: uuid.UUID, payload: TaskCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.create_task(session, ctx, project_id, payload)
    return ok(await service.serialize_task(session, task, project.key), message="Task created")


@router.post("/projects/{project_id}/tasks/batch", status_code=status.HTTP_201_CREATED)
async def batch_create_tasks(
    project_id: uuid.UUID, payload: TaskBatchCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskOut]]:
    tasks, project = await service.batch_create_tasks(session, ctx, project_id, payload)
    return ok(await service.serialize_tasks(session, tasks, project.key), message="Tasks created")


@router.get("/projects/{project_id}/tasks")
async def list_tasks(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    page: PageParamsDep,
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
    assignee_id: Annotated[uuid.UUID | None, Query()] = None,
    label_id: Annotated[uuid.UUID | None, Query()] = None,
    severity: Annotated[BugSeverity | None, Query()] = None,
    module_id: Annotated[uuid.UUID | None, Query()] = None,
    cycle_id: Annotated[uuid.UUID | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
    include_archived: Annotated[bool, Query()] = False,
) -> SuccessResponse[Page[TaskOut]]:
    tasks, project, total = await service.list_tasks(
        session,
        ctx,
        project_id,
        page,
        status=task_status,
        assignee_id=assignee_id,
        label_id=label_id,
        severity=severity,
        module_id=module_id,
        cycle_id=cycle_id,
        search=search,
        include_archived=include_archived,
    )
    items = await service.serialize_tasks(session, tasks, project.key)
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


async def _export_tasks(
    session: SessionDep, ctx: OrgContext, project_id: uuid.UUID, status_filter: TaskStatus | None
) -> list[TaskOut]:
    tasks, project, _ = await service.list_tasks(
        session,
        ctx,
        project_id,
        PageParams(limit=_EXPORT_CAP, offset=0),
        status=status_filter,
    )
    return await service.serialize_tasks(session, tasks, project.key)


@router.get("/projects/{project_id}/tasks/export.csv")
async def export_tasks_csv(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
) -> Response:
    items = await _export_tasks(session, ctx, project_id, task_status)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["identifier", "title", "status", "priority", "kind", "assignee_id", "due_date", "labels"]
    )
    for task in items:
        writer.writerow(
            [
                task.identifier,
                _csv_safe(task.title),
                task.status.value,
                task.priority.value,
                task.kind.value,
                str(task.assignee_id) if task.assignee_id else "",
                task.due_date.isoformat() if task.due_date else "",
                ", ".join(label.name for label in task.labels),
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tasks.csv"'},
    )


@router.get("/projects/{project_id}/tasks/export.json")
async def export_tasks_json(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
) -> SuccessResponse[list[TaskOut]]:
    items = await _export_tasks(session, ctx, project_id, task_status)
    return ok(items)


@router.get("/projects/{project_id}/tasks/board")
async def board(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[BoardColumn]]:
    columns, project = await service.board(session, ctx, project_id)
    payload = [
        BoardColumn(
            status=col_status, tasks=await service.serialize_tasks(session, tasks, project.key)
        )
        for col_status, tasks in columns.items()
    ]
    return ok(payload)


async def _my_tasks_page(
    scope: service.UserTaskScope, ctx: OrgContext, session: SessionDep, page: PageParams
) -> SuccessResponse[Page[TaskOut]]:
    tasks_with_keys, total = await service.list_user_tasks(session, ctx, scope, page)
    items = await service.serialize_mixed_tasks(session, tasks_with_keys)
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/tasks/assigned")
async def list_assigned_tasks(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[TaskOut]]:
    return await _my_tasks_page("assigned", ctx, session, page)


@router.get("/tasks/created")
async def list_created_tasks(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[TaskOut]]:
    return await _my_tasks_page("created", ctx, session, page)


@router.get("/tasks/subscribed")
async def list_subscribed_tasks(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[TaskOut]]:
    return await _my_tasks_page("subscribed", ctx, session, page)


@router.get("/tasks/all")
async def list_all_tasks(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[TaskOut]]:
    """Every task in the org, for a shared task list rather than a personal one."""
    return await _my_tasks_page("all", ctx, session, page)


@router.get("/tasks/recent")
async def list_recent_tasks(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[TaskOut]]:
    return await _my_tasks_page("recent", ctx, session, page)


@router.get("/tasks/by-identifier/{identifier}")
async def resolve_task_by_identifier(
    identifier: str, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.get_task_by_identifier(session, ctx, identifier)
    return ok(await service.serialize_task(session, task, project.key))


@router.get("/tasks/{task_id}")
async def get_task(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.get_task_with_project(session, ctx, task_id)
    return ok(await service.serialize_task(session, task, project.key))


@router.get("/tasks/{task_id}/subtasks")
async def list_subtasks(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskOut]]:
    subtasks, project = await service.list_subtasks(session, ctx, task_id)
    return ok(await service.serialize_tasks(session, subtasks, project.key))


@router.get("/tasks/{task_id}/transitions")
async def task_transitions(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskTransitionsOut]:
    data = await service.task_transitions(session, ctx, task_id)
    return ok(TaskTransitionsOut.model_validate(data))


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: uuid.UUID, payload: TaskUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.update_task(session, ctx, task_id, payload)
    return ok(await service.serialize_task(session, task, project.key), message="Task updated")


@router.get("/tasks/{task_id}/description/versions")
async def list_description_versions(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskDescriptionVersionOut]]:
    versions = await service.list_description_versions(session, ctx, task_id)
    return ok([TaskDescriptionVersionOut.model_validate(version) for version in versions])


@router.post("/tasks/{task_id}/description/versions/{version_id}/restore")
async def restore_description_version(
    task_id: uuid.UUID, version_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.restore_description_version(session, ctx, task_id, version_id)
    return ok(
        await service.serialize_task(session, task, project.key),
        message="Description restored",
    )


@router.post("/tasks/{task_id}/convert")
async def convert_task(
    task_id: uuid.UUID, payload: TaskConvertIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.convert_task_kind(session, ctx, task_id, payload.kind)
    return ok(
        await service.serialize_task(session, task, project.key), message="Work item converted"
    )


@router.post("/tasks/{task_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_task(
    task_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    payload: TaskDuplicateIn | None = None,
) -> SuccessResponse[TaskOut]:
    target = payload.target_project_id if payload is not None else None
    task, project = await service.duplicate_task(session, ctx, task_id, target)
    return ok(
        await service.serialize_task(session, task, project.key), message="Work item duplicated"
    )


@router.get("/tasks/{task_id}/updates")
async def list_work_item_updates(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[WorkItemUpdateOut]]:
    updates = await service.list_work_item_updates(session, ctx, task_id)
    return ok([WorkItemUpdateOut.model_validate(update) for update in updates])


@router.post("/tasks/{task_id}/updates", status_code=status.HTTP_201_CREATED)
async def create_work_item_update(
    task_id: uuid.UUID, payload: WorkItemUpdateCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorkItemUpdateOut]:
    update = await service.create_work_item_update(session, ctx, task_id, payload)
    return ok(WorkItemUpdateOut.model_validate(update), message="Update posted")


@router.post("/tasks/{task_id}/status")
async def transition_status(
    task_id: uuid.UUID, payload: TaskStatusIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.transition_status(session, ctx, task_id, payload.status)
    return ok(await service.serialize_task(session, task, project.key), message="Status updated")


@router.post("/tasks/{task_id}/archive")
async def archive_task(
    task_id: uuid.UUID, payload: TaskArchiveIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskOut]:
    task, project = await service.set_task_archived(session, ctx, task_id, payload.archived)
    return ok(
        await service.serialize_task(session, task, project.key),
        message="Task archived" if payload.archived else "Task restored",
    )


@router.get("/tasks/{task_id}/subscribers")
async def list_task_subscribers(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[uuid.UUID]]:
    return ok(await service.list_subscribers(session, ctx, task_id))


@router.post("/tasks/{task_id}/subscribe")
async def subscribe_task(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.set_task_subscription(session, ctx, task_id, subscribed=True)
    return ok(None, message="Subscribed")


@router.post("/tasks/{task_id}/unsubscribe")
async def unsubscribe_task(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.set_task_subscription(session, ctx, task_id, subscribed=False)
    return ok(None, message="Unsubscribed")


@router.get("/tasks/{task_id}/relations")
async def list_relations(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[RelatedTaskOut]]:
    relations = await service.list_relations(session, ctx, task_id)
    return ok([RelatedTaskOut.model_validate(relation) for relation in relations])


@router.get("/tasks/{task_id}/relations/grouped")
async def list_relations_grouped(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[dict[str, list[RelatedTaskOut]]]:
    grouped = await service.list_relations_grouped(session, ctx, task_id)
    return ok(
        {
            kind: [RelatedTaskOut.model_validate(relation) for relation in relations]
            for kind, relations in grouped.items()
        }
    )


@router.post("/tasks/{task_id}/relations", status_code=status.HTTP_201_CREATED)
async def create_relation(
    task_id: uuid.UUID, payload: TaskRelationIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.create_relation(
        session,
        ctx,
        task_id,
        payload.target_task_id,
        str(payload.type),
        custom_type_id=payload.custom_type_id,
    )
    return ok(None, message="Relation created")


@router.post("/tasks/{task_id}/relations/bulk", status_code=status.HTTP_201_CREATED)
async def create_relations_bulk(
    task_id: uuid.UUID, payload: TaskRelationBulkIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[RelationResult]]:
    results = await service.add_relations_bulk(
        session, ctx, task_id, payload.target_task_ids, str(payload.type)
    )
    return ok(
        [RelationResult.model_validate(result) for result in results],
        message="Relations processed",
    )


@router.delete("/tasks/{task_id}/relations/{relation_id}")
async def delete_relation(
    task_id: uuid.UUID, relation_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_relation(session, ctx, task_id, relation_id)
    return ok(None, message="Relation deleted")


@router.get("/projects/{project_id}/tasks/duplicate-check")
async def duplicate_check(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    title: Annotated[str, Query(min_length=1, max_length=500)],
    exclude: Annotated[uuid.UUID | None, Query()] = None,
) -> SuccessResponse[list[DuplicateCandidateOut]]:
    candidates = await service.find_duplicate_candidates(
        session, ctx, project_id, title=title, exclude_task_id=exclude
    )
    return ok([DuplicateCandidateOut.model_validate(c) for c in candidates])


@router.post("/tasks/{task_id}/not-duplicate/{other_id}")
async def mark_not_duplicate(
    task_id: uuid.UUID, other_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.mark_not_duplicate(session, ctx, task_id, other_id)
    return ok(None, message="Marked not a duplicate")


@router.get("/relation-types")
async def list_relation_types(
    ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[RelationTypeDefOut]]:
    defs = await service.list_relation_types(ctx, session)
    return ok([RelationTypeDefOut.model_validate(d) for d in defs])


@router.post("/relation-types", status_code=status.HTTP_201_CREATED)
async def create_relation_type(
    payload: RelationTypeDefIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RelationTypeDefOut]:
    definition = await service.create_relation_type(
        session,
        ctx,
        name=payload.name,
        outward_label=payload.outward_label,
        inward_label=payload.inward_label,
    )
    return ok(RelationTypeDefOut.model_validate(definition), message="Relation type created")


@router.delete("/relation-types/{type_id}")
async def delete_relation_type(
    type_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_relation_type(session, ctx, type_id)
    return ok(None, message="Relation type deleted")


@router.get("/tasks/{task_id}/links")
async def list_task_links(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskLinkOut]]:
    links = await service.list_task_links(session, ctx, task_id)
    return ok([TaskLinkOut.model_validate(link) for link in links])


@router.post("/tasks/{task_id}/links", status_code=status.HTTP_201_CREATED)
async def add_task_link(
    task_id: uuid.UUID, payload: TaskLinkIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskLinkOut]:
    link = await service.add_task_link(session, ctx, task_id, payload)
    return ok(TaskLinkOut.model_validate(link), message="Link added")


@router.delete("/tasks/{task_id}/links/{link_id}")
async def delete_task_link(
    task_id: uuid.UUID, link_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_task_link(session, ctx, task_id, link_id)
    return ok(None, message="Link deleted")


@router.get("/projects/{project_id}/analytics/throughput")
async def throughput_trend(
    project_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
    days: Annotated[int, Query(ge=7, le=90)] = 30,
) -> SuccessResponse[list[ThroughputPoint]]:
    points = await service.throughput_trend(session, ctx, project_id, days)
    return ok([ThroughputPoint.model_validate(point) for point in points])


@router.get("/projects/{project_id}/work-item-schema")
async def work_item_schema(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorkItemSchemaOut]:
    """Return the full schema (kinds, priorities, statuses, labels, custom props) for a project.

    Agent-native: lets an AI or integration discover exactly what fields/values a
    work item in this project supports before creating or updating one.
    """
    properties = await properties_service.list_properties(session, ctx, project_id)
    labels = await service.list_labels(session, ctx)
    return ok(
        WorkItemSchemaOut(
            kinds=list(TaskKind),
            priorities=list(TaskPriority),
            statuses=[
                StatusInfo(value=value, category=category)
                for value, category in STATUS_TO_CATEGORY.items()
            ],
            labels=[LabelOut.model_validate(label) for label in labels],
            custom_properties=[CustomPropertyOut.model_validate(prop) for prop in properties],
        )
    )


@router.get("/projects/{project_id}/templates")
async def list_templates(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[WorkItemTemplateOut]]:
    templates = await service.list_templates(session, ctx, project_id)
    return ok([WorkItemTemplateOut.model_validate(template) for template in templates])


@router.post("/projects/{project_id}/templates", status_code=status.HTTP_201_CREATED)
async def create_template(
    project_id: uuid.UUID, payload: WorkItemTemplateCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WorkItemTemplateOut]:
    template = await service.create_template(session, ctx, project_id, payload)
    return ok(WorkItemTemplateOut.model_validate(template), message="Template created")


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_template(session, ctx, template_id)
    return ok(None, message="Template deleted")


@router.get("/tasks/{task_id}/notes")
async def list_task_note_links(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[NoteLinkOut]]:
    rows = await service.list_note_links(session, ctx, task_id)
    return ok(
        [NoteLinkOut(note_id=note_id, title=title, project_id=pid) for note_id, title, pid in rows]
    )


@router.post("/tasks/{task_id}/notes/{note_id}", status_code=status.HTTP_201_CREATED)
async def link_task_note(
    task_id: uuid.UUID, note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.link_note(session, ctx, task_id, note_id)
    return ok(None, message="Note linked")


@router.delete("/tasks/{task_id}/notes/{note_id}")
async def unlink_task_note(
    task_id: uuid.UUID, note_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unlink_note(session, ctx, task_id, note_id)
    return ok(None, message="Note unlinked")


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_task(session, ctx, task_id)
    return ok(None, message="Task deleted")


@router.post("/labels", status_code=status.HTTP_201_CREATED)
async def create_label(
    payload: LabelCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[LabelOut]:
    label = await service.create_label(session, ctx, payload)
    return ok(LabelOut.model_validate(label), message="Label created")


@router.get("/labels")
async def list_labels(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[LabelOut]]:
    labels = await service.list_labels(session, ctx)
    return ok([LabelOut.model_validate(label) for label in labels])


@router.delete("/labels/{label_id}")
async def delete_label(
    label_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_label(session, ctx, label_id)
    return ok(None, message="Label deleted")


@router.get("/tasks/{task_id}/schedule-links")
async def list_schedule_links(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ScheduleLinkOut]]:
    rows = await service.list_schedule_links(session, ctx, task_id)
    return ok([ScheduleLinkOut.model_validate(r) for r in rows])


@router.post("/tasks/{task_id}/schedule-links", status_code=status.HTTP_201_CREATED)
async def create_schedule_link(
    task_id: uuid.UUID, payload: ScheduleLinkIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.create_schedule_link(
        session,
        ctx,
        task_id,
        other_task_id=payload.other_task_id,
        dependency_type=payload.dependency_type,
        other_is_predecessor=payload.other_is_predecessor,
    )
    return ok(None, message="Scheduling dependency created")


@router.delete("/tasks/{task_id}/schedule-links/{link_id}")
async def delete_schedule_link(
    task_id: uuid.UUID,  # noqa: ARG001
    link_id: uuid.UUID,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[None]:
    await service.delete_schedule_link(session, ctx, link_id)
    return ok(None, message="Scheduling dependency removed")


@router.post("/projects/{project_id}/import", status_code=status.HTTP_201_CREATED)
async def import_tasks(
    project_id: uuid.UUID, payload: TaskImportIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TaskImportOut]:
    """Bulk-create work items from pasted CSV (one-click migration, COS-270)."""
    report = await import_service.import_csv(session, ctx, project_id, payload.content)
    return ok(TaskImportOut.model_validate(report), message="Import complete")


@router.get("/projects/{project_id}/timeline")
async def project_timeline(
    project_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[TimelineOut]:
    """Gantt timeline for a project: dated tasks, scheduling connectors, critical path (COS-115)."""
    data = await timeline.project_timeline(session, ctx, project_id)
    return ok(TimelineOut.model_validate(data))


@router.post("/tasks/{task_id}/auto-shift")
async def auto_shift(
    task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[AutoShiftOut]:
    """Cascade date shifts to dependent successors after a date change (COS-126)."""
    shifted = await timeline.auto_shift(session, ctx, task_id)
    return ok(AutoShiftOut(shifted=[ShiftedTaskOut.model_validate(s) for s in shifted]))
