"""Outbound MCP connector CRUD + remote tool discovery (COS-228)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.mcp_connectors.catalog import catalog_entry
from elliptic.modules.mcp_connectors.models import McpConnector


def _aad(org_id: uuid.UUID) -> bytes:
    return f"mcp-connector:{org_id}".encode()


async def list_connectors(session: AsyncSession, ctx: OrgContext) -> list[McpConnector]:
    result = await session.scalars(
        select(McpConnector)
        .where(McpConnector.org_id == ctx.org.id)
        .order_by(McpConnector.created_at)
    )
    return list(result)


async def get_connector(
    session: AsyncSession, ctx: OrgContext, connector_id: uuid.UUID
) -> McpConnector:
    connector = await session.scalar(
        select(McpConnector).where(
            McpConnector.id == connector_id, McpConnector.org_id == ctx.org.id
        )
    )
    if connector is None:
        raise NotFoundError("Connector not found")
    return connector


async def create_connector(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    catalog_key: str,
    endpoint_url: str | None,
    credential: str | None,
    header_name: str | None,
) -> McpConnector:
    entry = catalog_entry(catalog_key)
    if entry is None:
        raise BadRequestError("Unknown catalog entry")
    url = (endpoint_url or entry["endpoint_url"]).strip()
    if not url:
        raise BadRequestError("An endpoint URL is required")
    connector = McpConnector(
        org_id=ctx.org.id,
        catalog_key=catalog_key,
        display_name=entry["name"],
        transport=entry["transport"],
        endpoint_url=url,
        auth_type=entry["auth_type"],
        header_name=header_name,
        created_by=ctx.user.id,
    )
    if credential:
        nonce, ciphertext = encrypt_secret(credential, get_settings().kek_bytes, _aad(ctx.org.id))
        connector.encrypted_credential = ciphertext
        connector.nonce = nonce
    session.add(connector)
    await session.flush()
    return connector


async def set_enabled(
    session: AsyncSession, ctx: OrgContext, connector_id: uuid.UUID, enabled: bool
) -> McpConnector:
    connector = await get_connector(session, ctx, connector_id)
    connector.enabled = enabled
    await session.flush()
    return connector


async def delete_connector(session: AsyncSession, ctx: OrgContext, connector_id: uuid.UUID) -> None:
    connector = await get_connector(session, ctx, connector_id)
    await session.delete(connector)
    await session.flush()


async def discover_tools(connector: McpConnector, org_id: uuid.UUID) -> list[dict[str, str]]:
    """Connect to the remote MCP server and list its tools (mocked in tests, COS-228)."""
    from fastmcp import Client  # noqa: PLC0415

    headers: dict[str, str] = {}
    if connector.encrypted_credential and connector.nonce:
        credential = decrypt_secret(
            connector.nonce, connector.encrypted_credential, get_settings().kek_bytes, _aad(org_id)
        )
        if connector.auth_type == "header" and connector.header_name:
            headers[connector.header_name] = credential
        else:
            headers["Authorization"] = f"Bearer {credential}"

    async with Client(connector.endpoint_url, auth=headers.get("Authorization")) as client:
        tools = await client.list_tools()
    return [{"name": t.name, "description": t.description or ""} for t in tools]


async def test_connection(
    session: AsyncSession, ctx: OrgContext, connector_id: uuid.UUID
) -> dict[str, object]:
    connector = await get_connector(session, ctx, connector_id)
    try:
        tools = await discover_tools(connector, ctx.org.id)
        return {"ok": True, "tools": tools, "error": None}
    except Exception as exc:
        return {"ok": False, "tools": [], "error": str(exc)[:300]}
