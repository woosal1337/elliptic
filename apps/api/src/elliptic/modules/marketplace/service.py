"""Marketplace catalog + installed aggregation (COS-273)."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.marketplace.catalog import registry
from elliptic.modules.mcp_connectors.models import McpConnector


def catalog(category: str | None = None) -> list[dict[str, str]]:
    items = registry()
    if category:
        items = [item for item in items if item["category"] == category]
    return items


async def installed(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:
    """A summary of what's actually installed/active in this workspace (COS-273)."""
    connectors = int(
        await session.scalar(select(func.count()).where(McpConnector.org_id == ctx.org.id)) or 0
    )
    return {
        "connectors": connectors,
        "categories": {
            "app": len([i for i in registry() if i["category"] == "app"]),
            "agent": len([i for i in registry() if i["category"] == "agent"]),
            "importer": len([i for i in registry() if i["category"] == "importer"]),
            "connector": len([i for i in registry() if i["category"] == "connector"]),
        },
    }
