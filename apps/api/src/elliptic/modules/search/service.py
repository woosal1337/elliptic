"""Unified fuzzy search across workspace entities (COS-253).

Backend does a cheap substring (ILIKE) prefilter per entity, then Python
difflib scoring ranks the merged candidate set. Everything is org-scoped via
OrgContext (a member sees their organization's content). An external search
engine (OpenSearch) + semantic ranking is a deferred phase.
"""

from difflib import SequenceMatcher

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.cycles.models import Cycle
from elliptic.modules.meetings.models import Meeting
from elliptic.modules.modules.models import Module
from elliptic.modules.notes.models import Note
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task

_PER_ENTITY_CANDIDATES = 40


def _score(query: str, *fields: str | None) -> float:
    """Blend a substring bonus with a fuzzy ratio over the best-matching field."""
    q = query.lower().strip()
    best = 0.0
    for field in fields:
        if not field:
            continue
        text = field.lower()
        ratio = SequenceMatcher(None, q, text).ratio()
        if q in text:
            position = text.index(q)
            ratio = max(ratio, 0.75 + 0.2 * (1 - position / max(len(text), 1)))
        best = max(best, ratio)
    return round(best, 4)


def _snippet(text: str | None, limit: int = 160) -> str | None:
    if not text:
        return None
    cleaned = " ".join(text.split())
    return cleaned[:limit] + ("…" if len(cleaned) > limit else "")


async def search(
    session: AsyncSession,
    ctx: OrgContext,
    query: str,
    *,
    types: list[str] | None = None,
    limit: int = 20,
) -> list[dict[str, object]]:
    org_id = ctx.org.id
    like = f"%{query.strip()}%"
    want = set(types) if types else None
    hits: list[dict[str, object]] = []

    def included(kind: str) -> bool:
        return want is None or kind in want

    project_rows = list(
        await session.execute(
            select(Project.id, Project.key, Project.name).where(
                Project.org_id == org_id, Project.deleted_at.is_(None)
            )
        )
    )
    key_by_project = {pid: key for pid, key, _ in project_rows}

    if included("project"):
        for pid, key, name in project_rows:
            if query.lower() in (name or "").lower() or query.lower() in (key or "").lower():
                hits.append(
                    {
                        "type": "project",
                        "id": pid,
                        "title": name,
                        "snippet": key,
                        "project_id": pid,
                        "identifier": key,
                        "score": _score(query, name, key),
                    }
                )

    if included("task"):
        tasks = await session.scalars(
            select(Task)
            .where(
                Task.org_id == org_id,
                Task.archived_at.is_(None),
                or_(Task.title.ilike(like), Task.description.ilike(like)),
            )
            .limit(_PER_ENTITY_CANDIDATES)
        )
        for task in tasks:
            key = key_by_project.get(task.project_id)
            hits.append(
                {
                    "type": "task",
                    "id": task.id,
                    "title": task.title,
                    "snippet": _snippet(task.description),
                    "project_id": task.project_id,
                    "identifier": f"{key}-{task.number}" if key else None,
                    "score": _score(query, task.title, task.description),
                }
            )

    if included("note"):
        notes = await session.scalars(
            select(Note)
            .where(Note.org_id == org_id, Note.archived_at.is_(None), Note.title.ilike(like))
            .limit(_PER_ENTITY_CANDIDATES)
        )
        hits.extend(
            {
                "type": "note",
                "id": note.id,
                "title": note.title,
                "snippet": None,
                "project_id": note.project_id,
                "identifier": None,
                "score": _score(query, note.title),
            }
            for note in notes
        )

    if included("meeting"):
        meetings = await session.scalars(
            select(Meeting)
            .where(Meeting.org_id == org_id, Meeting.title.ilike(like))
            .limit(_PER_ENTITY_CANDIDATES)
        )
        hits.extend(
            {
                "type": "meeting",
                "id": meeting.id,
                "title": meeting.title,
                "snippet": None,
                "project_id": meeting.project_id,
                "identifier": None,
                "score": _score(query, meeting.title),
            }
            for meeting in meetings
        )

    if included("cycle"):
        cycles = await session.scalars(
            select(Cycle)
            .where(Cycle.org_id == org_id, Cycle.name.ilike(like))
            .limit(_PER_ENTITY_CANDIDATES)
        )
        hits.extend(
            {
                "type": "cycle",
                "id": cycle.id,
                "title": cycle.name,
                "snippet": None,
                "project_id": cycle.project_id,
                "identifier": None,
                "score": _score(query, cycle.name),
            }
            for cycle in cycles
        )

    if included("module"):
        mods = await session.scalars(
            select(Module)
            .where(
                Module.org_id == org_id,
                Module.archived_at.is_(None),
                or_(Module.name.ilike(like), Module.description.ilike(like)),
            )
            .limit(_PER_ENTITY_CANDIDATES)
        )
        hits.extend(
            {
                "type": "module",
                "id": mod.id,
                "title": mod.name,
                "snippet": _snippet(mod.description),
                "project_id": mod.project_id,
                "identifier": None,
                "score": _score(query, mod.name, mod.description),
            }
            for mod in mods
        )

    def sort_key(hit: dict[str, object]) -> float:
        value = hit["score"]
        return value if isinstance(value, float) else 0.0

    hits.sort(key=sort_key, reverse=True)
    return hits[:limit]
