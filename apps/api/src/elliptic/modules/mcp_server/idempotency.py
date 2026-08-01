"""Idempotent execution of create/import tools keyed per organization."""

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.modules.mcp_server.models import McpIdempotencyKey


async def run_idempotent(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    key: str | None,
    tool: str,
    producer: Callable[[], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    """Run producer once per (org, key); a repeated key returns the stored result."""
    if not key:
        return await producer()
    existing = await session.scalar(
        select(McpIdempotencyKey).where(
            McpIdempotencyKey.org_id == org_id, McpIdempotencyKey.key == key
        )
    )
    if existing is not None:
        return existing.result
    result = await producer()
    session.add(McpIdempotencyKey(org_id=org_id, key=key, tool=tool, result=result))
    return result
