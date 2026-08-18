"""Project timeline + critical-path computation over scheduling links (COS-115)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.tasks.models import (
    STATUS_TO_CATEGORY,
    StatusCategory,
    Task,
    TaskScheduleLink,
)


def _critical_path(
    node_ids: list[uuid.UUID],
    edges: list[tuple[uuid.UUID, uuid.UUID]],
    duration: dict[uuid.UUID, int],
) -> list[uuid.UUID]:
    """Longest weighted path through the dependency DAG (cycles ignored)."""
    successors: dict[uuid.UUID, list[uuid.UUID]] = {n: [] for n in node_ids}
    indegree: dict[uuid.UUID, int] = dict.fromkeys(node_ids, 0)
    for pre, suc in edges:
        if pre in successors and suc in indegree:
            successors[pre].append(suc)
            indegree[suc] += 1

    queue = [n for n in node_ids if indegree[n] == 0]
    order: list[uuid.UUID] = []
    indeg = dict(indegree)
    while queue:
        node = queue.pop()
        order.append(node)
        for suc in successors[node]:
            indeg[suc] -= 1
            if indeg[suc] == 0:
                queue.append(suc)

    best_len: dict[uuid.UUID, int] = {}
    best_prev: dict[uuid.UUID, uuid.UUID | None] = {}
    for node in order:
        best_len[node] = duration.get(node, 1)
        best_prev[node] = None
    for node in order:
        for suc in successors[node]:
            candidate = best_len[node] + duration.get(suc, 1)
            if candidate > best_len.get(suc, 0):
                best_len[suc] = candidate
                best_prev[suc] = node

    if not best_len:
        return []
    end = max(best_len, key=lambda n: best_len[n])
    chain: list[uuid.UUID] = []
    cursor: uuid.UUID | None = end
    while cursor is not None:
        chain.append(cursor)
        cursor = best_prev.get(cursor)
    chain.reverse()
    return chain if len(chain) > 1 else []


def _is_violated(kind: str, pred: Task, succ: Task) -> bool:
    """A scheduling link is violated when current dates break its constraint (COS-138)."""
    if kind == "finish_to_start" and pred.due_date and succ.start_date:
        return succ.start_date <= pred.due_date
    if kind == "start_to_start" and pred.start_date and succ.start_date:
        return succ.start_date < pred.start_date
    if kind == "finish_to_finish" and pred.due_date and succ.due_date:
        return succ.due_date < pred.due_date
    if kind == "start_to_finish" and pred.start_date and succ.due_date:
        return succ.due_date < pred.start_date
    return False


async def project_timeline(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> dict[str, object]:
    """Tasks with dates + their scheduling links + the critical path (COS-115)."""
    from elliptic.modules.projects.models import Project  # noqa: PLC0415

    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    key = project.key if project else None

    tasks = list(
        await session.scalars(
            select(Task)
            .where(
                Task.org_id == ctx.org.id,
                Task.project_id == project_id,
                Task.archived_at.is_(None),
            )
            .order_by(Task.sort_order, Task.number)
        )
    )
    task_ids = [t.id for t in tasks]
    id_set = set(task_ids)

    links = list(
        await session.scalars(
            select(TaskScheduleLink).where(
                TaskScheduleLink.predecessor_id.in_(task_ids),
                TaskScheduleLink.successor_id.in_(task_ids),
            )
        )
    )
    edges = [
        (link.predecessor_id, link.successor_id)
        for link in links
        if link.predecessor_id in id_set and link.successor_id in id_set
    ]

    def _duration(task: Task) -> int:
        if task.start_date and task.due_date:
            return max((task.due_date - task.start_date).days, 1)
        return 1

    duration = {t.id: _duration(t) for t in tasks}
    critical = _critical_path(task_ids, edges, duration)
    critical_set = set(critical)

    by_id = {t.id: t for t in tasks}
    violated_links: dict[uuid.UUID, bool] = {}
    violated_tasks: set[uuid.UUID] = set()
    for link in links:
        pred = by_id.get(link.predecessor_id)
        succ = by_id.get(link.successor_id)
        bad = bool(pred and succ and _is_violated(link.dependency_type.value, pred, succ))
        violated_links[link.id] = bad
        if bad and succ is not None:
            violated_tasks.add(succ.id)

    return {
        "tasks": [
            {
                "id": t.id,
                "identifier": f"{key}-{t.number}" if key else None,
                "title": t.title,
                "status": t.status.value,
                "start_date": t.start_date,
                "due_date": t.due_date,
                "on_critical_path": t.id in critical_set,
                "is_violated": t.id in violated_tasks,
                "is_done": STATUS_TO_CATEGORY.get(t.status) is StatusCategory.COMPLETED,
            }
            for t in tasks
        ],
        "links": [
            {
                "predecessor_id": link.predecessor_id,
                "successor_id": link.successor_id,
                "dependency_type": link.dependency_type.value,
                "violated": violated_links.get(link.id, False),
            }
            for link in links
        ],
        "critical_path": critical,
        "violation_count": sum(1 for v in violated_links.values() if v),
    }


async def auto_shift(  # noqa: PLR0915
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> list[dict[str, object]]:
    """Cascade date shifts to dependent successors so scheduling links hold (COS-126).

    Forward-only: a successor is only pushed LATER to satisfy its predecessor
    constraints, never earlier. Durations are preserved when a start moves. The
    propagation walks the dependency DAG in topological order from ``task_id``.
    """
    from datetime import timedelta  # noqa: PLC0415

    from elliptic.modules.projects.models import Project  # noqa: PLC0415

    anchor = await session.scalar(select(Task).where(Task.id == task_id, Task.org_id == ctx.org.id))
    if anchor is None:
        from elliptic.core.exceptions import NotFoundError  # noqa: PLC0415

        raise NotFoundError("Task not found")

    tasks = list(
        await session.scalars(
            select(Task).where(
                Task.org_id == ctx.org.id,
                Task.project_id == anchor.project_id,
                Task.archived_at.is_(None),
            )
        )
    )
    by_id = {t.id: t for t in tasks}
    ids = list(by_id)

    links = list(
        await session.scalars(
            select(TaskScheduleLink).where(
                TaskScheduleLink.predecessor_id.in_(ids),
                TaskScheduleLink.successor_id.in_(ids),
            )
        )
    )
    successors: dict[uuid.UUID, list[TaskScheduleLink]] = {i: [] for i in ids}
    indegree: dict[uuid.UUID, int] = dict.fromkeys(ids, 0)
    for link in links:
        if link.predecessor_id in successors and link.successor_id in indegree:
            successors[link.predecessor_id].append(link)
            indegree[link.successor_id] += 1

    queue = [i for i in ids if indegree[i] == 0]
    order: list[uuid.UUID] = []
    indeg = dict(indegree)
    while queue:
        node = queue.pop()
        order.append(node)
        for link in successors[node]:
            indeg[link.successor_id] -= 1
            if indeg[link.successor_id] == 0:
                queue.append(link.successor_id)

    changed: dict[uuid.UUID, tuple[object, object]] = {}

    def _require_min_start(task: Task, min_start: "object") -> None:
        if task.start_date is None or min_start is None:
            return
        if task.start_date < min_start:  # type: ignore[operator]
            delta = min_start - task.start_date  # type: ignore[operator]
            task.start_date = min_start  # type: ignore[assignment]
            if task.due_date is not None:
                task.due_date = task.due_date + delta
            changed[task.id] = (task.start_date, task.due_date)

    def _require_min_due(task: Task, min_due: "object") -> None:
        if task.due_date is None or min_due is None:
            return
        if task.due_date < min_due:  # type: ignore[operator]
            task.due_date = min_due  # type: ignore[assignment]
            changed[task.id] = (task.start_date, task.due_date)

    for node in order:
        for link in successors[node]:
            pred = by_id[link.predecessor_id]
            succ = by_id[link.successor_id]
            kind = link.dependency_type.value
            if kind == "finish_to_start" and pred.due_date is not None:
                _require_min_start(succ, pred.due_date + timedelta(days=1))
            elif kind == "start_to_start" and pred.start_date is not None:
                _require_min_start(succ, pred.start_date)
            elif kind == "finish_to_finish" and pred.due_date is not None:
                _require_min_due(succ, pred.due_date)
            elif kind == "start_to_finish" and pred.start_date is not None:
                _require_min_due(succ, pred.start_date)

    await session.flush()

    keys: dict[uuid.UUID, str] = {  # noqa: C416
        pid: key
        for pid, key in await session.execute(
            select(Project.id, Project.key).where(Project.org_id == ctx.org.id)
        )
    }
    return [
        {
            "id": tid,
            "identifier": (
                f"{keys.get(by_id[tid].project_id)}-{by_id[tid].number}"
                if keys.get(by_id[tid].project_id)
                else None
            ),
            "title": by_id[tid].title,
            "start_date": by_id[tid].start_date,
            "due_date": by_id[tid].due_date,
        }
        for tid in changed
    ]
