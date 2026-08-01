"""Universal identifier resolver for deep links / short URLs (COS-226).

Resolves a single opaque identifier (a KEY-N task code, a bare project key, or a
comment UUID) to the canonical entity it points at, so /browse/<id> can route
anywhere. Archived/soft-deleted entities resolve read-only rather than 404.
"""

import uuid

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.exceptions import NotFoundError
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.comments.models import Comment
from elliptic.modules.projects.models import Project, ProjectStatus
from elliptic.modules.tasks.models import Task

router = APIRouter(prefix="/orgs/{org_id}/resolve", tags=["resolve"])


class ResolveOut(BaseModel):
    """Where a short identifier points."""

    kind: str
    project_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    note_id: uuid.UUID | None = None
    meeting_id: uuid.UUID | None = None
    comment_id: uuid.UUID | None = None
    entity_type: str | None = None
    archived: bool = False


def _maybe_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


@router.get("/{identifier}")
async def resolve(identifier: str, ctx: OrgCtx, session: SessionDep) -> SuccessResponse[ResolveOut]:
    """Resolve a task code, project key, or comment id to its canonical entity."""
    org_id = ctx.org.id
    as_uuid = _maybe_uuid(identifier)

    if as_uuid is not None:
        comment = await session.scalar(
            select(Comment).where(Comment.id == as_uuid, Comment.org_id == org_id)
        )
        if comment is not None:
            out = ResolveOut(
                kind="comment",
                comment_id=comment.id,
                entity_type=comment.entity_type.value,
            )
            if comment.entity_type.value == "task":
                task = await session.scalar(
                    select(Task).where(Task.id == comment.entity_id, Task.org_id == org_id)
                )
                if task is not None:
                    out.task_id = task.id
                    out.project_id = task.project_id
                    out.archived = task.archived_at is not None
            elif comment.entity_type.value == "note":
                out.note_id = comment.entity_id
            elif comment.entity_type.value == "meeting":
                out.meeting_id = comment.entity_id
            return ok(out)
        task = await session.scalar(select(Task).where(Task.id == as_uuid, Task.org_id == org_id))
        if task is not None:
            return ok(
                ResolveOut(
                    kind="task",
                    task_id=task.id,
                    project_id=task.project_id,
                    archived=task.archived_at is not None,
                )
            )

    key, _, number_str = identifier.rpartition("-")
    if key and number_str.isdigit():
        project = await session.scalar(
            select(Project).where(Project.org_id == org_id, func.upper(Project.key) == key.upper())
        )
        if project is not None:
            task = await session.scalar(
                select(Task).where(
                    Task.project_id == project.id,
                    Task.number == int(number_str),
                    Task.org_id == org_id,
                )
            )
            if task is not None:
                return ok(
                    ResolveOut(
                        kind="task",
                        task_id=task.id,
                        project_id=project.id,
                        archived=task.archived_at is not None,
                    )
                )

    project = await session.scalar(
        select(Project).where(
            Project.org_id == org_id, func.upper(Project.key) == identifier.upper()
        )
    )
    if project is not None:
        archived = project.status == ProjectStatus.ARCHIVED or project.deleted_at is not None
        return ok(ResolveOut(kind="project", project_id=project.id, archived=archived))

    raise NotFoundError("Nothing resolves to that identifier")
