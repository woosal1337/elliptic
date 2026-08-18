"""Integration connection business logic."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.integrations import slack_client
from elliptic.modules.integrations.models import SlackConnection
from elliptic.modules.integrations.schemas import SlackChannelOut, SlackConnectionOut


def _aad(org_id: uuid.UUID) -> bytes:
    return str(org_id).encode()


async def get_slack_connection(session: AsyncSession, ctx: OrgContext) -> SlackConnection | None:
    """Return the org's Slack connection, or None when not connected."""
    connection: SlackConnection | None = await session.scalar(
        select(SlackConnection).where(SlackConnection.org_id == ctx.org.id)
    )
    return connection


def to_connection_out(connection: SlackConnection | None) -> SlackConnectionOut:
    """Shape a connection (or its absence) into the public status payload."""
    if connection is None:
        return SlackConnectionOut(connected=False, team_name=None)
    return SlackConnectionOut(connected=True, team_name=connection.team_name)


async def _require_connection(session: AsyncSession, ctx: OrgContext) -> SlackConnection:
    connection = await get_slack_connection(session, ctx)
    if connection is None:
        raise BadRequestError("Slack is not connected for this organization")
    return connection


def _bot_token(connection: SlackConnection) -> str:
    return decrypt_secret(
        connection.nonce,
        connection.encrypted_token,
        get_settings().kek_bytes,
        _aad(connection.org_id),
    )


async def list_slack_channels(session: AsyncSession, ctx: OrgContext) -> list[SlackChannelOut]:
    """List the connected workspace's channels."""
    connection = await _require_connection(session, ctx)
    channels = await slack_client.list_channels(_bot_token(connection))
    return [SlackChannelOut(id=channel["id"], name=channel["name"]) for channel in channels]


async def connect_slack(session: AsyncSession, ctx: OrgContext, code: str) -> SlackConnection:
    """Complete the Slack OAuth handshake and store the encrypted bot token (admin)."""
    data = await slack_client.exchange_oauth_code(code)
    nonce, ciphertext = encrypt_secret(
        data["access_token"], get_settings().kek_bytes, _aad(ctx.org.id)
    )
    connection = await get_slack_connection(session, ctx)
    if connection is None:
        connection = SlackConnection(
            org_id=ctx.org.id,
            team_id=data["team_id"],
            team_name=data["team_name"],
            encrypted_token=ciphertext,
            nonce=nonce,
            installed_by=ctx.user.id,
        )
        session.add(connection)
    else:
        connection.team_id = data["team_id"]
        connection.team_name = data["team_name"]
        connection.encrypted_token = ciphertext
        connection.nonce = nonce
        connection.installed_by = ctx.user.id
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="integration",
        entity_id=connection.id,
        event_type="slack_connected",
        actor_id=ctx.user.id,
        payload={"team_name": connection.team_name},
    )
    return connection
