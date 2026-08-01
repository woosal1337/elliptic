"""CSV / row-based work-item import (one-click migration) (COS-270)."""

import csv
import io
import uuid
from contextlib import suppress

from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError
from elliptic.modules.tasks.models import BugSeverity, TaskKind, TaskPriority, TaskStatus
from elliptic.modules.tasks.schemas import TaskCreateIn
from elliptic.modules.tasks.service import create_task

_TITLE_KEYS = ("title", "summary", "name", "subject")
_DESC_KEYS = ("description", "body", "details", "notes")
_STATUS_KEYS = ("status", "state")
_PRIORITY_KEYS = ("priority", "importance")
_STATUS_MAP = {
    "backlog": TaskStatus.BACKLOG,
    "todo": TaskStatus.TODO,
    "to do": TaskStatus.TODO,
    "open": TaskStatus.TODO,
    "in progress": TaskStatus.IN_PROGRESS,
    "in-progress": TaskStatus.IN_PROGRESS,
    "doing": TaskStatus.IN_PROGRESS,
    "in review": TaskStatus.IN_REVIEW,
    "review": TaskStatus.IN_REVIEW,
    "done": TaskStatus.DONE,
    "closed": TaskStatus.DONE,
    "complete": TaskStatus.DONE,
    "completed": TaskStatus.DONE,
    "canceled": TaskStatus.CANCELLED,
    "cancelled": TaskStatus.CANCELLED,
}
_PRIORITY_MAP = {
    "none": TaskPriority.NONE,
    "low": TaskPriority.LOW,
    "lowest": TaskPriority.LOW,
    "medium": TaskPriority.MEDIUM,
    "normal": TaskPriority.MEDIUM,
    "high": TaskPriority.HIGH,
    "highest": TaskPriority.URGENT,
    "urgent": TaskPriority.URGENT,
    "critical": TaskPriority.URGENT,
}


def _pick(row: dict[str, str], keys: tuple[str, ...]) -> str:
    for key in keys:
        for actual, value in row.items():
            if actual.strip().lower() == key and value and value.strip():
                return value.strip()
    return ""


def _row_to_payload(row: dict[str, str]) -> TaskCreateIn | None:
    title = _pick(row, _TITLE_KEYS)
    if not title:
        return None
    status = _STATUS_MAP.get(_pick(row, _STATUS_KEYS).lower(), TaskStatus.BACKLOG)
    priority = _PRIORITY_MAP.get(_pick(row, _PRIORITY_KEYS).lower(), TaskPriority.NONE)
    description = _pick(row, _DESC_KEYS) or None
    kind = TaskKind.TASK
    severity = None
    if _pick(row, ("type", "kind", "issuetype")).lower() in {"bug", "defect"}:
        kind = TaskKind.BUG
        severity = BugSeverity.MEDIUM
    return TaskCreateIn(
        title=title[:500],
        description=description,
        status=status,
        priority=priority,
        kind=kind,
        severity=severity,
    )


async def import_csv(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, content: str
) -> dict[str, object]:
    """Parse CSV text and create a work item per row; return a summary report."""
    text = content.strip()
    if not text:
        raise BadRequestError("No CSV content provided")
    try:
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    except csv.Error as exc:
        raise BadRequestError(f"Could not parse CSV: {exc}") from exc
    if not rows:
        raise BadRequestError("The CSV has no data rows")

    created: list[str] = []
    skipped = 0
    errors: list[str] = []
    for index, row in enumerate(rows, start=2):
        payload = _row_to_payload(row)
        if payload is None:
            skipped += 1
            continue
        try:
            task, project = await create_task(session, ctx, project_id, payload)
            created.append(f"{project.key}-{task.number}")
        except Exception as exc:
            with suppress(Exception):
                errors.append(f"Row {index}: {exc!s}"[:200])
    return {
        "created_count": len(created),
        "skipped_count": skipped,
        "identifiers": created,
        "errors": errors,
    }
