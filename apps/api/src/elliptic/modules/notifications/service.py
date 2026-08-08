"""Notification business logic, recipient-scoped reads and mutations."""

import uuid
from datetime import datetime

import httpx
from loguru import logger
from sqlalchemy import Select, and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.notifications.models import (
    DeviceToken,
    Notification,
    NotificationPreference,
    NotificationType,
)
from elliptic.modules.notifications.schemas import (
    NotificationOut,
    NotificationStatusFilter,
)
from elliptic.modules.users.models import User


def notification_to_out(notification: Notification, actor_name: str | None) -> NotificationOut:
    """Serialize a notification with the resolved actor display name."""
    return NotificationOut(
        id=notification.id,
        org_id=notification.org_id,
        type=notification.type,
        entity_type=notification.entity_type,
        entity_id=notification.entity_id,
        actor_id=notification.actor_id,
        actor_name=actor_name,
        title=notification.title,
        snippet=notification.snippet,
        read_at=notification.read_at,
        archived_at=notification.archived_at,
        snoozed_until=notification.snoozed_until,
        created_at=notification.created_at,
    )


def _unread_predicate(now: datetime) -> ColumnElement[bool]:
    return and_(
        Notification.read_at.is_(None),
        Notification.archived_at.is_(None),
        or_(Notification.snoozed_until.is_(None), Notification.snoozed_until <= now),
    )


async def _unread_count(
    session: AsyncSession, recipient_id: uuid.UUID, org_id: uuid.UUID, now: datetime
) -> int:
    """Unread for one recipient in one workspace.

    Scoped to the org because the inbox it labels is: list_for_user filters by
    org, so counting across all of them produced a badge the user could not
    clear — unread in a workspace they were not looking at, over an inbox that
    correctly showed nothing.
    """
    return (
        await session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.recipient_id == recipient_id,
                Notification.org_id == org_id,
                _unread_predicate(now),
            )
        )
        or 0
    )


async def _resolve_actor_names(
    session: AsyncSession, notifications: list[Notification]
) -> dict[uuid.UUID, str]:
    actor_ids = {n.actor_id for n in notifications if n.actor_id is not None}
    if not actor_ids:
        return {}
    rows = await session.execute(select(User.id, User.full_name).where(User.id.in_(actor_ids)))
    return {row.id: row.full_name for row in rows}


async def notify(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    recipient_id: uuid.UUID,
    type: NotificationType,  # noqa: A002
    entity_type: str,
    entity_id: uuid.UUID | None,
    actor_id: uuid.UUID | None,
    title: str,
    snippet: str | None = None,
    identifier: str | None = None,
    allow_self: bool = False,
) -> Notification | None:
    """Insert a notification for a recipient, skipping self-notification.

    Returns the created notification, or ``None`` when the recipient is the actor
    and ``allow_self`` is unset. The notification is added to the caller's
    transaction and not committed here.

    ``allow_self`` exists for the board events — a task appearing, a status
    moving — which people want to see for their own actions too: the push is the
    receipt that the change actually landed, which matters when it was made on
    another device or by an agent acting for them. Everything aimed at a person
    (assignment, mention, comment) keeps the default, where announcing your own
    action back to you is just noise.

    ``identifier`` is the human key (``COS-234``); it rides in the push payload
    so a tapped notification can title its screen before the task has loaded.
    """
    if actor_id is not None and recipient_id == actor_id and not allow_self:
        return None
    notification = Notification(
        org_id=org_id,
        recipient_id=recipient_id,
        type=type,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        title=title,
        snippet=snippet,
    )
    session.add(notification)
    await session.flush()
    await _fanout_push(
        session,
        recipient_id,
        org_id,
        title,
        snippet or title,
        {
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "type": type.value,
            "identifier": identifier,
            # A push is not org-scoped the way the inbox is, so the payload has
            # to say which workspace it came from — otherwise a tap opens the
            # entity under whichever org the app happens to be in and reports it
            # missing.
            "org_id": str(org_id),
        },
    )
    return notification


async def list_for_user(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    status: NotificationStatusFilter = "unread",
    limit: int = 50,
) -> tuple[list[Notification], dict[uuid.UUID, str], int]:
    """List the caller's own notifications by status, newest first, with unread count."""
    now = utcnow()
    query: Select[tuple[Notification]] = select(Notification).where(
        Notification.recipient_id == ctx.user.id,
        Notification.org_id == ctx.org.id,
    )
    if status == "unread":
        query = query.where(_unread_predicate(now))
    elif status == "archived":
        query = query.where(Notification.archived_at.is_not(None))
    result = await session.scalars(
        query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)
    )
    notifications = list(result)
    actor_names = await _resolve_actor_names(session, notifications)
    unread_count = await _unread_count(session, ctx.user.id, ctx.org.id, now)
    return notifications, actor_names, unread_count


async def unread_count(session: AsyncSession, ctx: OrgContext) -> int:
    """Return the caller's current unread notification count."""
    return await _unread_count(session, ctx.user.id, ctx.org.id, utcnow())


async def _get_own(
    session: AsyncSession, ctx: OrgContext, notification_id: uuid.UUID
) -> Notification:
    notification = await session.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == ctx.user.id,
            Notification.org_id == ctx.org.id,
        )
    )
    if notification is None:
        raise NotFoundError("Notification not found")
    return notification


async def mark_read(
    session: AsyncSession, ctx: OrgContext, notification_id: uuid.UUID
) -> tuple[Notification, str | None]:
    """Mark one of the caller's notifications as read."""
    notification = await _get_own(session, ctx, notification_id)
    if notification.read_at is None:
        notification.read_at = utcnow()
    await session.flush()
    names = await _resolve_actor_names(session, [notification])
    return notification, names.get(notification.actor_id) if notification.actor_id else None


async def mark_all_read(session: AsyncSession, ctx: OrgContext) -> None:
    """Mark all of the caller's unread notifications as read."""
    await session.execute(
        update(Notification)
        .where(
            Notification.recipient_id == ctx.user.id,
            Notification.org_id == ctx.org.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=utcnow())
    )
    await session.flush()


async def archive(
    session: AsyncSession, ctx: OrgContext, notification_id: uuid.UUID
) -> tuple[Notification, str | None]:
    """Archive one of the caller's notifications."""
    notification = await _get_own(session, ctx, notification_id)
    if notification.archived_at is None:
        notification.archived_at = utcnow()
    await session.flush()
    names = await _resolve_actor_names(session, [notification])
    return notification, names.get(notification.actor_id) if notification.actor_id else None


async def snooze(
    session: AsyncSession, ctx: OrgContext, notification_id: uuid.UUID, until: datetime
) -> tuple[Notification, str | None]:
    """Snooze one of the caller's notifications until a future moment."""
    if until <= utcnow():
        raise BadRequestError("Snooze time must be in the future")
    notification = await _get_own(session, ctx, notification_id)
    notification.snoozed_until = until
    await session.flush()
    names = await _resolve_actor_names(session, [notification])
    return notification, names.get(notification.actor_id) if notification.actor_id else None


_PREF_FIELDS = (
    "notify_property_change",
    "notify_state_change",
    "notify_completed",
    "notify_comments",
    "notify_mentions",
)

# Which toggle governs which notification. Everything aimed at a person lands
# under the category a person would look for it in, rather than under the field
# that technically changed — someone silencing "Comments" means comments, not
# "the comment_count property".
_PREF_FOR_TYPE: dict[str, str] = {
    NotificationType.MENTIONED.value: "notify_mentions",
    NotificationType.COMMENTED.value: "notify_comments",
    NotificationType.STATUS_CHANGED.value: "notify_state_change",
    NotificationType.TASK_CREATED.value: "notify_state_change",
    NotificationType.ASSIGNED.value: "notify_property_change",
    NotificationType.URGENT.value: "notify_property_change",
    NotificationType.MEMBER_ADDED.value: "notify_property_change",
    NotificationType.MEETING_ACTION_DONE.value: "notify_completed",
}


async def list_preferences(session: AsyncSession, ctx: OrgContext) -> list[NotificationPreference]:
    """The caller's notification preferences: workspace default + per-project overrides."""
    result = await session.scalars(
        select(NotificationPreference).where(
            NotificationPreference.org_id == ctx.org.id,
            NotificationPreference.user_id == ctx.user.id,
        )
    )
    return list(result)


async def set_preferences(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    project_id: uuid.UUID | None,
    values: dict[str, bool],
) -> NotificationPreference:
    """Upsert the caller's preferences for a scope (workspace default or a project)."""
    pref = await session.scalar(
        select(NotificationPreference).where(
            NotificationPreference.org_id == ctx.org.id,
            NotificationPreference.user_id == ctx.user.id,
            NotificationPreference.project_id == project_id
            if project_id is not None
            else NotificationPreference.project_id.is_(None),
        )
    )
    if pref is None:
        pref = NotificationPreference(org_id=ctx.org.id, user_id=ctx.user.id, project_id=project_id)
        session.add(pref)
    for field in _PREF_FIELDS:
        if field in values:
            setattr(pref, field, values[field])
    await session.flush()
    return pref


async def notification_enabled_for(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None,
    field: str,
) -> bool:
    """Resolve whether a user wants push for a trigger: per-project override wins
    over the workspace default, which defaults to on. (The in-app inbox is always
    on — a silenced category still records, it just does not buzz.)"""
    if project_id is not None:
        override = await session.scalar(
            select(NotificationPreference).where(
                NotificationPreference.org_id == org_id,
                NotificationPreference.user_id == user_id,
                NotificationPreference.project_id == project_id,
            )
        )
        if override is not None:
            return bool(getattr(override, field))
    workspace = await session.scalar(
        select(NotificationPreference).where(
            NotificationPreference.org_id == org_id,
            NotificationPreference.user_id == user_id,
            NotificationPreference.project_id.is_(None),
        )
    )
    if workspace is not None:
        return bool(getattr(workspace, field))
    return True


async def catch_up_digest(
    session: AsyncSession, ctx: OrgContext, recipient_id: uuid.UUID
) -> dict[str, object]:
    """Roll up unread notifications into a per-entity catch-up digest (COS-161)."""
    now = utcnow()
    rows = list(
        await session.scalars(
            select(Notification)
            .where(
                Notification.recipient_id == recipient_id,
                Notification.org_id == ctx.org.id,
                _unread_predicate(now),
            )
            .order_by(Notification.created_at.desc())
        )
    )
    by_type: dict[str, int] = {}
    order: list[tuple[str, str]] = []
    counts: dict[tuple[str, str], int] = {}
    meta: dict[tuple[str, str], dict[str, object]] = {}
    for note in rows:
        by_type[note.type.value] = by_type.get(note.type.value, 0) + 1
        gkey = (note.entity_type, str(note.entity_id) if note.entity_id else "")
        if gkey not in counts:
            order.append(gkey)
            counts[gkey] = 0
            meta[gkey] = {
                "entity_type": note.entity_type,
                "entity_id": str(note.entity_id) if note.entity_id else None,
                "title": note.title,
                "latest_at": note.created_at.isoformat(),
            }
        counts[gkey] += 1
    groups = [{**meta[gkey], "count": counts[gkey]} for gkey in order]
    return {
        "total_unread": len(rows),
        "by_type": by_type,
        "groups": groups,
    }


async def catch_up_mark_entity_read(
    session: AsyncSession,
    ctx: OrgContext,
    recipient_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID | None,
) -> int:
    """Mark every unread notification for one catch-up entity as read (COS-239)."""
    now = utcnow()
    conditions = [
        Notification.recipient_id == recipient_id,
        Notification.org_id == ctx.org.id,
        Notification.entity_type == entity_type,
        _unread_predicate(now),
    ]
    if entity_id is not None:
        conditions.append(Notification.entity_id == entity_id)
    marked = int(
        await session.scalar(select(func.count()).select_from(Notification).where(*conditions)) or 0
    )
    await session.execute(update(Notification).where(*conditions).values(read_at=now))
    await session.flush()
    return marked


async def catch_up_project_summary(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> dict[str, object]:
    """An AI 'what changed' digest of a project's recent activity (COS-239)."""
    from elliptic.modules.activity.models import ActivityEvent  # noqa: PLC0415
    from elliptic.modules.ai.models import AIRunPurpose  # noqa: PLC0415
    from elliptic.modules.ai.providers import ChatMessage  # noqa: PLC0415
    from elliptic.modules.ai.service import run_completion  # noqa: PLC0415
    from elliptic.modules.projects.models import Project  # noqa: PLC0415

    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")

    events = list(
        await session.scalars(
            select(ActivityEvent)
            .where(ActivityEvent.org_id == ctx.org.id, ActivityEvent.project_id == project_id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(60)
        )
    )
    if not events:
        return {"summary": "Nothing has changed in this project recently.", "event_count": 0}

    lines = [
        f"- {e.entity_type} {e.event_type}"
        + (f": {e.payload.get('title') or e.payload.get('snippet')}" if e.payload else "")
        for e in events
    ]
    context = "\n".join(lines)
    messages: list[ChatMessage] = [
        {
            "role": "system",
            "content": (
                "You write a brief 'what changed since your last visit' digest for a "
                "project. Summarize the activity into 3-6 concise markdown bullets, "
                "grouping related changes. No preamble."
            ),
        },
        {"role": "user", "content": f"Project: {project.name}\n\nRecent activity:\n{context}"},
    ]
    result, _run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    return {"summary": result.content.strip(), "event_count": len(events)}


async def register_device_token(
    session: AsyncSession, ctx: OrgContext, platform: str, token: str
) -> "DeviceToken":
    """Upsert a push device token for the caller (COS-290)."""
    existing = await session.scalar(select(DeviceToken).where(DeviceToken.token == token))
    if existing is not None:
        existing.user_id = ctx.user.id
        existing.org_id = ctx.org.id
        existing.platform = platform
        existing.last_seen_at = utcnow()
        await session.flush()
        return existing
    row = DeviceToken(
        org_id=ctx.org.id,
        user_id=ctx.user.id,
        platform=platform,
        token=token,
        last_seen_at=utcnow(),
    )
    session.add(row)
    await session.flush()
    return row


async def revoke_device_token(session: AsyncSession, ctx: OrgContext, token: str) -> None:
    row = await session.scalar(
        select(DeviceToken).where(DeviceToken.token == token, DeviceToken.user_id == ctx.user.id)
    )
    if row is not None:
        await session.delete(row)
        await session.flush()


async def _recipient_push_tokens(session: AsyncSession, recipient_id: uuid.UUID) -> list[str]:
    rows = await session.scalars(
        select(DeviceToken.token).where(DeviceToken.user_id == recipient_id)
    )
    return list(rows)


# Android files every notification under a channel and lets the user set
# importance per channel, so this split decides what they can mute without
# muting everything: what was aimed at them, what was said, and what merely
# happened. The board events are the chatty ones and sit alone in `activity`.
#
# Keyed by the enum's value, not the member: Enum hashes by name, so a member
# key would never match the value string carried in the payload.
_PUSH_CHANNEL = {
    NotificationType.ASSIGNED.value: "direct",
    NotificationType.MENTIONED.value: "direct",
    NotificationType.URGENT.value: "direct",
    NotificationType.COMMENTED.value: "comments",
}
_DEFAULT_CHANNEL = "activity"


async def _send_expo_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, object],
    *,
    badge: int | None = None,
) -> list[str]:
    """Deliver via Expo Push (the default transport). Pluggable for APNs/FCM later.

    Returns the tokens Expo reported as permanently dead, for the caller to prune.
    """
    channel = _PUSH_CHANNEL.get(str(data.get("type")), _DEFAULT_CHANNEL)
    # iOS stacks notifications sharing a thread, so a task that moves three times
    # reads as one collapsible group rather than three separate rows.
    thread = f"{data.get('entity_type')}:{data.get('entity_id')}"
    envelope: dict[str, object] = {
        "title": title,
        "body": body,
        "data": data,
        "sound": "default",
        "channelId": channel,
        "threadId": thread,
        "priority": "high" if channel == "direct" else "default",
    }
    if badge is not None:
        envelope["badge"] = badge
    messages = [{"to": t, **envelope} for t in tokens if t.startswith("ExponentPushToken")]
    if not messages:
        return []
    async with httpx.AsyncClient(timeout=8.0) as http:
        response = await http.post(get_settings().expo_push_url, json=messages)

    # Expo answers 200 with a per-message ticket even when every message failed,
    # so discarding the body hides a total outage: a project with no APNs key
    # rejects everything with InvalidCredentials and looks exactly like success.
    dead: list[str] = []
    try:
        tickets = response.json().get("data", [])
    except ValueError:
        logger.error(
            "Expo push returned non-JSON ({}): {}", response.status_code, response.text[:200]
        )
        return dead
    for message, ticket in zip(messages, tickets, strict=False):
        if ticket.get("status") != "error":
            continue
        reason = ticket.get("details", {}).get("error")
        logger.error("Expo push rejected: {} — {}", reason, ticket.get("message"))
        # The device uninstalled or the token was reissued. Expo asks senders to
        # stop using it, and keeping it means retrying a dead token forever.
        if reason == "DeviceNotRegistered":
            dead.append(str(message["to"]))
    return dead


async def _fanout_push(
    session: AsyncSession,
    recipient_id: uuid.UUID,
    org_id: uuid.UUID,
    title: str,
    body: str,
    data: dict[str, object],
) -> None:
    """Best-effort push send alongside the in-app inbox (gated by PUSH_ENABLED) — COS-290."""
    if not get_settings().push_enabled:
        return
    try:
        field = _PREF_FOR_TYPE.get(str(data.get("type")))
        if field is not None and not await notification_enabled_for(
            session,
            org_id=org_id,
            user_id=recipient_id,
            project_id=None,
            field=field,
        ):
            return
        tokens = await _recipient_push_tokens(session, recipient_id)
        if not tokens:
            return
        # The badge is the unread inbox count rather than a per-message tally, so
        # the number on the icon matches what the inbox shows when it is opened.
        badge = await _unread_count(session, recipient_id, org_id, utcnow())
        dead = await _send_expo_push(tokens, title, body, data, badge=badge)
        if dead:
            await session.execute(delete(DeviceToken).where(DeviceToken.token.in_(dead)))
            await session.flush()
            logger.info("Pruned {} dead push token(s)", len(dead))
    except Exception:
        logger.exception("Push fan-out failed for recipient {}", recipient_id)
