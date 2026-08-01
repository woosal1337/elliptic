"""Cross-project company-brain tools: open threads, what changed, project resume."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select

from elliptic.core.pagination import PageParams
from elliptic.modules.activity import service as activity_service
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.notes import service as notes_service
from elliptic.modules.notes.schemas import NoteOut
from elliptic.modules.tasks import service as tasks_service
from elliptic.modules.tasks.models import StatusCategory

_CLOSED = {StatusCategory.COMPLETED, StatusCategory.CANCELLED}


def _event_dict(event: ActivityEvent) -> dict[str, Any]:
    return {
        "id": str(event.id),
        "entity_type": event.entity_type,
        "entity_id": str(event.entity_id),
        "event_type": event.event_type,
        "project_id": str(event.project_id) if event.project_id else None,
        "actor_id": str(event.actor_id) if event.actor_id else None,
        "created_at": event.created_at.isoformat(),
    }


@mcp.tool
async def brain_open_threads(limit: int = 25) -> dict[str, Any]:
    """What's on my plate: my open assigned and created tasks, plus the triage queue."""
    async with mcp_call("brain:read") as call:
        page = PageParams(limit=limit, offset=0)
        assigned, _assigned_total = await tasks_service.list_user_tasks(
            call.session, call.ctx, "assigned", page
        )
        created, _created_total = await tasks_service.list_user_tasks(
            call.session, call.ctx, "created", page
        )
        triage = await tasks_service.list_triage_tasks(call.session, call.ctx)

        async def _open(rows: list[tuple[Any, str]]) -> list[dict[str, Any]]:
            items = await tasks_service.serialize_mixed_tasks(call.session, rows)
            return [item.model_dump(mode="json") for item in items if item.category not in _CLOSED]

        return {
            "assigned_to_me": await _open(assigned),
            "created_by_me": await _open(created),
            "triage": [
                item.model_dump(mode="json")
                for item in await tasks_service.serialize_mixed_tasks(call.session, triage)
            ],
        }


@mcp.tool
async def brain_changes_since(since: str, limit: int = 100) -> dict[str, Any]:
    """What changed in the organization since an ISO-8601 timestamp."""
    async with mcp_call("brain:read") as call:
        floor = datetime.fromisoformat(since)
        events, _total = await activity_service.list_org_feed(
            call.session, call.ctx, PageParams(limit=limit, offset=0)
        )
        recent = [_event_dict(event) for event in events if event.created_at >= floor]
        return {"since": since, "count": len(recent), "items": recent}


@mcp.tool
async def brain_resume(project_id: str, limit: int = 20) -> dict[str, Any]:
    """Where did we leave off on a project: in-flight tasks, recent notes, recent activity."""
    async with mcp_call("brain:read") as call:
        pid = uuid.UUID(project_id)
        tasks, project, _total = await tasks_service.list_tasks(
            call.session, call.ctx, pid, PageParams(limit=limit, offset=0)
        )
        task_items = await tasks_service.serialize_tasks(call.session, tasks, project.key)
        in_flight = [
            item.model_dump(mode="json")
            for item in task_items
            if item.category == StatusCategory.STARTED
        ]
        notes, _notes_total = await notes_service.list_notes(
            call.session, call.ctx, PageParams(limit=10, offset=0), project_id=pid
        )
        recent_activity = await call.session.scalars(
            select(ActivityEvent)
            .where(ActivityEvent.org_id == call.ctx.org.id, ActivityEvent.project_id == pid)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
        )
        return {
            "project": {"id": str(project.id), "key": project.key, "name": project.name},
            "in_flight_tasks": in_flight,
            "recent_notes": [
                NoteOut.model_validate(note).model_dump(mode="json") for note in notes
            ],
            "recent_activity": [_event_dict(event) for event in recent_activity],
        }
