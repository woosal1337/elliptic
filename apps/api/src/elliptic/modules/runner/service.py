"""Runner script CRUD + execution log (COS-251)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.runner.models import (
    RunnerExecution,
    RunnerExecutionStatus,
    RunnerScript,
)

_LANGUAGES = {"javascript", "typescript"}

_CRON_FIELD_COUNT = 5


def _validate_cron(expr: str | None) -> None:
    """Reject a malformed 5-field cron expression (minute hour dom month dow)."""
    if expr is None or not expr.strip():
        return
    fields = expr.split()
    if len(fields) != _CRON_FIELD_COUNT:
        raise BadRequestError("Cron schedule must have 5 fields (minute hour day month weekday)")


async def list_scripts(session: AsyncSession, ctx: OrgContext) -> list[RunnerScript]:
    result = await session.scalars(
        select(RunnerScript)
        .where(RunnerScript.org_id == ctx.org.id)
        .order_by(RunnerScript.created_at)
    )
    return list(result)


async def create_script(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    name: str,
    description: str | None,
    language: str,
    code: str,
    cron_schedule: str | None,
) -> RunnerScript:
    if language not in _LANGUAGES:
        raise BadRequestError(f"Unsupported language: {language}")
    _validate_cron(cron_schedule)
    script = RunnerScript(
        org_id=ctx.org.id,
        name=name,
        description=description,
        language=language,
        code=code,
        cron_schedule=cron_schedule,
        created_by=ctx.user.id,
    )
    session.add(script)
    await session.flush()
    return script


async def get_script(session: AsyncSession, ctx: OrgContext, script_id: uuid.UUID) -> RunnerScript:
    script = await session.scalar(
        select(RunnerScript).where(RunnerScript.id == script_id, RunnerScript.org_id == ctx.org.id)
    )
    if script is None:
        raise NotFoundError("Script not found")
    return script


async def update_script(
    session: AsyncSession,
    ctx: OrgContext,
    script_id: uuid.UUID,
    *,
    name: str | None,
    description: str | None,
    code: str | None,
    cron_schedule: str | None,
    enabled: bool | None,
) -> RunnerScript:
    script = await get_script(session, ctx, script_id)
    if name is not None:
        script.name = name
    if description is not None:
        script.description = description
    if code is not None:
        script.code = code
    if cron_schedule is not None:
        _validate_cron(cron_schedule)
        script.cron_schedule = cron_schedule or None
    if enabled is not None:
        script.enabled = enabled
    await session.flush()
    return script


async def delete_script(session: AsyncSession, ctx: OrgContext, script_id: uuid.UUID) -> None:
    script = await get_script(session, ctx, script_id)
    await session.delete(script)
    await session.flush()


async def list_executions(
    session: AsyncSession, ctx: OrgContext, script_id: uuid.UUID
) -> list[RunnerExecution]:
    await get_script(session, ctx, script_id)
    result = await session.scalars(
        select(RunnerExecution)
        .where(RunnerExecution.script_id == script_id)
        .order_by(RunnerExecution.created_at.desc())
        .limit(50)
    )
    return list(result)


async def trigger(session: AsyncSession, ctx: OrgContext, script_id: uuid.UUID) -> RunnerExecution:
    """Queue a manual execution. The sandboxed worker that runs it is deferred."""
    script = await get_script(session, ctx, script_id)
    execution = RunnerExecution(
        org_id=ctx.org.id,
        script_id=script.id,
        status=RunnerExecutionStatus.QUEUED,
        trigger="manual",
        output="Queued — the sandboxed execution runtime is not yet enabled.",
    )
    session.add(execution)
    await session.flush()
    return execution
