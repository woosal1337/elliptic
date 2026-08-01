"""Execute a PQL query over a task dataset (COS-154)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.models_base import utcnow
from elliptic.modules.pql import executor
from elliptic.modules.pql.parser import PqlError, parse
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import Task

_RESULT_CAP = 500


def validate_query(query: str) -> None:
    """Parse + validate a query; raises PqlError on any problem."""
    executor.validate(parse(query))


async def execute_query(
    session: AsyncSession,
    ctx: OrgContext,
    query: str,
    *,
    project_id: uuid.UUID | None = None,
) -> list[dict[str, object]]:
    """Run a PQL filter over the org's (or a project's) tasks and return matches."""
    node = parse(query)
    executor.validate(node)
    today = utcnow().date()

    stmt = select(Task).where(Task.org_id == ctx.org.id, Task.archived_at.is_(None))
    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    tasks = list(await session.scalars(stmt.order_by(Task.sort_order, Task.number)))

    project_keys: dict[uuid.UUID, str] = {  # noqa: C416
        pid: key
        for pid, key in await session.execute(
            select(Project.id, Project.key).where(Project.org_id == ctx.org.id)
        )
    }

    results: list[dict[str, object]] = []
    for task in tasks:
        if executor.evaluate(node, task, today):
            key = project_keys.get(task.project_id)
            results.append(
                {
                    "id": task.id,
                    "identifier": f"{key}-{task.number}" if key else None,
                    "title": task.title,
                    "status": task.status.value,
                    "priority": task.priority.value,
                    "assignee_id": task.assignee_id,
                    "due_date": task.due_date,
                    "project_id": task.project_id,
                }
            )
            if len(results) >= _RESULT_CAP:
                break
    return results


_GRAMMAR_PROMPT = (
    "You translate a natural-language request into a Elliptic Query Language (PQL) "
    "filter over work items. Output ONLY the query, no explanation, no code fences.\n"
    "Fields: status (backlog|todo|in_progress|in_review|done|cancelled), "
    "priority (none|low|medium|high|urgent), kind (task|bug|...), severity, component, "
    "title, description, number, assignee (uuid or compare to null), label, due_date "
    "(YYYY-MM-DD), release_blocker (true|false), is_triage (true|false).\n"
    "Operators: = != ~ (contains) < <= > >= , IN [..], NOT IN [..]. "
    "Combine with and / or / not and parentheses.\n"
    "Functions (no args): is_overdue() has_no_assignee() has_no_label() is_top_level() "
    "is_done() is_open().\n"
    "Examples:\n"
    'overdue bugs with nobody assigned -> kind = "bug" and is_overdue() and has_no_assignee()\n'
    'high or urgent open items -> priority in ["high", "urgent"] and is_open()\n'
    'tasks mentioning billing -> title ~ "billing" or description ~ "billing"'
)


async def generate_query(session: AsyncSession, ctx: OrgContext, prompt: str) -> str:
    """Use the org's LLM to turn natural language into a validated PQL query (COS-163)."""
    from elliptic.core.exceptions import BadRequestError  # noqa: PLC0415
    from elliptic.modules.ai.models import AIRunPurpose  # noqa: PLC0415
    from elliptic.modules.ai.providers import ChatMessage  # noqa: PLC0415
    from elliptic.modules.ai.service import run_completion  # noqa: PLC0415

    messages: list[ChatMessage] = [
        {"role": "system", "content": _GRAMMAR_PROMPT},
        {"role": "user", "content": prompt.strip()},
    ]
    result, _run = await run_completion(
        session, ctx, purpose=AIRunPurpose.CHAT, messages=messages, max_tokens=200
    )
    query = result.content.strip().strip("`").strip()
    if query.lower().startswith("pql"):
        query = query[3:].strip()
    try:
        validate_query(query)
    except PqlError as exc:
        raise BadRequestError(
            f"The assistant produced an invalid query ({exc}). Try rephrasing."
        ) from exc
    return query
