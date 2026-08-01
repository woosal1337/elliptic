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
from elliptic.modules.meetings import service as meetings_service
from elliptic.modules.meetings.models import MeetingShare, MeetingSummary


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


def build_slack_message(
    title: str, summary: str | None, action_items: list[str], ask_url: str | None
) -> str:
    """Assemble the Slack message: title, summary, action items, and an Ask link."""
    lines = [f"*{title}*"]
    if summary:
        lines.append(summary[:1500])
    if action_items:
        lines.append("*Action items*")
        lines.extend(f"• {item}" for item in action_items[:10])
    if ask_url:
        lines.append(f"<{ask_url}|Ask about this meeting>")
    return "\n".join(lines)


async def send_meeting_to_slack(
    session: AsyncSession, ctx: OrgContext, meeting_id: uuid.UUID, channel_id: str
) -> bool:
    """Post a meeting's summary + action items to a Slack channel."""
    connection = await _require_connection(session, ctx)
    meeting = await meetings_service.get_meeting(session, ctx, meeting_id)
    summary = await session.scalar(
        select(MeetingSummary)
        .where(MeetingSummary.meeting_id == meeting.id)
        .order_by(MeetingSummary.created_at.desc())
        .limit(1)
    )
    action_items, _ = meetings_service.extract_action_items_decisions(summary)
    share = await session.scalar(select(MeetingShare).where(MeetingShare.meeting_id == meeting.id))
    ask_url = (
        f"{get_settings().app_base_url}/share/meetings/{share.token}"
        if share is not None and not share.revoked
        else None
    )
    text = build_slack_message(
        meeting.title, summary.content if summary is not None else None, action_items, ask_url
    )
    await slack_client.post_message(_bot_token(connection), channel_id, text)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting",
        entity_id=meeting.id,
        event_type="slack_posted",
        actor_id=ctx.user.id,
        payload={"channel_id": channel_id},
    )
    return True


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
