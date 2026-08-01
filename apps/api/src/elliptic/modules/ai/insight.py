"""Heuristic project routing and context aggregation over org data (TRI-04, MA-16).

Deterministic keyword-overlap scoring, no model call required. Both surfaces are
honest about thin evidence: routing returns a null suggestion with zero
confidence when nothing matches, and aggregation reports explicit coverage so the
UI can show "consulted N of M" rather than a confident guess.
"""

import uuid
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.core.text import content_tokens as _tokens
from elliptic.core.text import token_overlap as _overlap
from elliptic.modules.ai.schemas import (
    ContextAggregationOut,
    ContextSignalOut,
    CoverageOut,
    RouteSuggestionOut,
)
from elliptic.modules.meetings.models import Meeting
from elliptic.modules.notes.models import Note
from elliptic.modules.projects.models import Project, ProjectStatus
from elliptic.modules.tasks.models import Task

_MAX_PER_KIND = 3


async def suggest_route(
    session: AsyncSession,
    ctx: OrgContext,
    kind: Literal["task", "meeting"],
    item_id: uuid.UUID,
) -> RouteSuggestionOut:
    """Suggest the active project an unfiled task or meeting most likely belongs to."""
    if kind == "task":
        task = await session.scalar(
            select(Task).where(Task.id == item_id, Task.org_id == ctx.org.id)
        )
        if task is None:
            raise NotFoundError("Task not found")
        item_tokens = _tokens(task.title, task.description)
    else:
        meeting = await session.scalar(
            select(Meeting).where(Meeting.id == item_id, Meeting.org_id == ctx.org.id)
        )
        if meeting is None:
            raise NotFoundError("Meeting not found")
        item_tokens = _tokens(
            meeting.title, meeting.raw_markdown, " ".join(meeting.external_attendees or [])
        )
    projects = list(
        await session.scalars(
            select(Project).where(
                Project.org_id == ctx.org.id,
                Project.status == ProjectStatus.ACTIVE,
                Project.deleted_at.is_(None),
            )
        )
    )
    scored = sorted(
        (
            (
                _overlap(item_tokens, _tokens(project.name, project.key, project.description)),
                project,
            )
            for project in projects
        ),
        key=lambda pair: pair[0],
        reverse=True,
    )
    if not scored or scored[0][0] == 0:
        return RouteSuggestionOut(project_id=None, route=None, confidence=0.0)
    best_score, best = scored[0]
    runner_up = scored[1][0] if len(scored) > 1 else 0
    confidence = round(best_score / (best_score + runner_up + 1), 2)
    return RouteSuggestionOut(project_id=best.id, route=best.name, confidence=confidence)


async def aggregate_context(
    session: AsyncSession,
    ctx: OrgContext,
    item_id: uuid.UUID,
) -> ContextAggregationOut:
    """Surface related tasks, meetings, and notes for a task or triage item."""
    task = await session.scalar(select(Task).where(Task.id == item_id, Task.org_id == ctx.org.id))
    if task is None:
        raise NotFoundError("Task not found")
    anchor = _tokens(task.title, task.description)
    signals: list[ContextSignalOut] = []
    scanned = 0
    matched = 0
    best = 0

    other_tasks = list(
        await session.scalars(
            select(Task).where(
                Task.org_id == ctx.org.id, Task.id != task.id, Task.is_triage.is_(False)
            )
        )
    )
    task_hits: list[tuple[int, Task]] = []
    for candidate in other_tasks:
        scanned += 1
        score = _overlap(anchor, _tokens(candidate.title, candidate.description))
        if score > 0:
            task_hits.append((score, candidate))
    task_hits.sort(key=lambda pair: pair[0], reverse=True)
    for score, candidate in task_hits[:_MAX_PER_KIND]:
        matched += 1
        best = max(best, score)
        signals.append(
            ContextSignalOut(kind="related_task", id=candidate.id, title=candidate.title)
        )

    meetings = list(await session.scalars(select(Meeting).where(Meeting.org_id == ctx.org.id)))
    meeting_hits: list[tuple[int, Meeting]] = []
    for meeting in meetings:
        scanned += 1
        score = _overlap(anchor, _tokens(meeting.title))
        if task.source_meeting_id is not None and meeting.id == task.source_meeting_id:
            score += 100
        if score > 0:
            meeting_hits.append((score, meeting))
    meeting_hits.sort(key=lambda pair: pair[0], reverse=True)
    for score, meeting in meeting_hits[:_MAX_PER_KIND]:
        matched += 1
        best = max(best, score)
        signals.append(ContextSignalOut(kind="related_meeting", id=meeting.id, title=meeting.title))

    notes = list(await session.scalars(select(Note).where(Note.org_id == ctx.org.id)))
    note_hits: list[tuple[int, Note]] = []
    for note in notes:
        scanned += 1
        score = _overlap(anchor, _tokens(note.title, note.content))
        if score > 0:
            note_hits.append((score, note))
    note_hits.sort(key=lambda pair: pair[0], reverse=True)
    for score, note in note_hits[:_MAX_PER_KIND]:
        matched += 1
        best = max(best, score)
        signals.append(ContextSignalOut(kind="related_note", id=note.id, title=note.title))

    confidence = round(min(1.0, 0.25 * min(best, 4) + 0.1 * len(signals)), 2) if signals else 0.0
    return ContextAggregationOut(
        signals=signals,
        confidence=confidence,
        coverage=CoverageOut(consulted=matched, total=scanned),
    )
