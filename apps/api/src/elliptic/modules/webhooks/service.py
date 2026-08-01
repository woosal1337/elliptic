"""Webhook business logic: CRUD, the event dispatcher, and test deliveries."""

import uuid
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.database import session_factory
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.meetings.models import Meeting
from elliptic.modules.notes.models import Note
from elliptic.modules.orgs.models import Organization
from elliptic.modules.projects.models import Project
from elliptic.modules.tasks.models import STATUS_TO_CATEGORY, StatusCategory, Task
from elliptic.modules.users.models import User
from elliptic.modules.webhooks import sender
from elliptic.modules.webhooks.catalog import (
    EVENT_LABELS,
    EVENT_MAP,
    ORG_SCOPED_KEYS,
    category_for,
)
from elliptic.modules.webhooks.formatting import (
    RenderModel,
    build_discord_payload,
    build_slack_payload,
)
from elliptic.modules.webhooks.models import ProjectWebhook
from elliptic.modules.webhooks.schemas import (
    WebhookCreateIn,
    WebhookOut,
    WebhookTestResult,
    WebhookUpdateIn,
)
from elliptic.modules.webhooks.security import detect_provider_and_validate, mask_url

_STATUS_OK = "ok"
_STATUS_FAILED = "failed"


def _aad(org_id: uuid.UUID) -> bytes:
    return str(org_id).encode()


def to_out(wh: ProjectWebhook) -> WebhookOut:
    """Shape a webhook row into its public, URL-free view."""
    return WebhookOut.model_validate(wh)


async def _require_project(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> Project:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise NotFoundError("Project not found")
    return project


async def get_webhook(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, webhook_id: uuid.UUID
) -> ProjectWebhook:
    """Fetch a webhook scoped to the caller's org and project, or 404."""
    wh = await session.scalar(
        select(ProjectWebhook).where(
            ProjectWebhook.id == webhook_id,
            ProjectWebhook.org_id == ctx.org.id,
            ProjectWebhook.project_id == project_id,
        )
    )
    if wh is None:
        raise NotFoundError("Webhook not found")
    return wh


async def list_webhooks(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[ProjectWebhook]:
    """List a project's webhooks, newest first."""
    await _require_project(session, ctx, project_id)
    result = await session.scalars(
        select(ProjectWebhook)
        .where(ProjectWebhook.org_id == ctx.org.id, ProjectWebhook.project_id == project_id)
        .order_by(ProjectWebhook.created_at.desc())
    )
    return list(result)


async def create_webhook(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: WebhookCreateIn
) -> ProjectWebhook:
    """Create a webhook after validating the project, provider, and destination URL."""
    await _require_project(session, ctx, project_id)
    provider = detect_provider_and_validate(payload.url)
    nonce, ciphertext = encrypt_secret(payload.url, get_settings().kek_bytes, _aad(ctx.org.id))
    wh = ProjectWebhook(
        org_id=ctx.org.id,
        project_id=project_id,
        provider=provider,
        name=payload.name,
        encrypted_url=ciphertext,
        nonce=nonce,
        url_hint=mask_url(payload.url),
        enabled=payload.enabled,
        events=payload.events,
        created_by=ctx.user.id,
    )
    session.add(wh)
    await session.flush()
    return wh


async def update_webhook(
    session: AsyncSession,
    ctx: OrgContext,
    project_id: uuid.UUID,
    webhook_id: uuid.UUID,
    payload: WebhookUpdateIn,
) -> ProjectWebhook:
    """Apply a partial update; re-validate and re-encrypt when the URL changes."""
    wh = await get_webhook(session, ctx, project_id, webhook_id)
    if payload.url is not None:
        provider = detect_provider_and_validate(payload.url)
        nonce, ciphertext = encrypt_secret(payload.url, get_settings().kek_bytes, _aad(ctx.org.id))
        wh.provider = provider
        wh.encrypted_url = ciphertext
        wh.nonce = nonce
        wh.url_hint = mask_url(payload.url)
    if payload.name is not None:
        wh.name = payload.name
    if payload.events is not None:
        wh.events = payload.events
    if payload.enabled is not None:
        wh.enabled = payload.enabled
    await session.flush()
    return wh


async def delete_webhook(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, webhook_id: uuid.UUID
) -> None:
    """Delete a webhook within the caller's project."""
    wh = await get_webhook(session, ctx, project_id, webhook_id)
    await session.delete(wh)
    await session.flush()


def _decrypt_url(wh: ProjectWebhook) -> str:
    return decrypt_secret(wh.nonce, wh.encrypted_url, get_settings().kek_bytes, _aad(wh.org_id))


async def test_send(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, webhook_id: uuid.UUID
) -> WebhookTestResult:
    """Send a sample message to a webhook and record the delivery outcome."""
    wh = await get_webhook(session, ctx, project_id, webhook_id)
    url = _decrypt_url(wh)
    rm = RenderModel(
        title="Test webhook",
        subtitle="Sample message from Elliptic",
        category="created",
        event_label="Test webhook",
        url=get_settings().app_base_url,
        actor_name=ctx.user.full_name,
    )
    payload = _payload_for(wh.provider, rm)
    ok, detail = await sender.send(wh.provider, url, payload, secret=wh.secret, event_type="test")
    _record_delivery(wh, ok=ok, detail=detail)
    await session.flush()
    return WebhookTestResult(
        ok=ok, status=_STATUS_OK if ok else _STATUS_FAILED, detail=None if ok else detail
    )


def _payload_for(provider: str, rm: RenderModel) -> dict[str, Any]:
    return build_slack_payload(rm) if provider == "slack" else build_discord_payload(rm)


def _record_delivery(wh: ProjectWebhook, *, ok: bool, detail: str) -> None:
    wh.last_delivery_at = utcnow()
    wh.last_delivery_status = _STATUS_OK if ok else _STATUS_FAILED
    wh.last_delivery_error = None if ok else detail[:500]


def _opt_uuid(value: Any) -> uuid.UUID | None:
    return uuid.UUID(str(value)) if value else None


async def dispatch_event(event: dict[str, Any]) -> None:
    """Fan one realtime activity event out to subscribed project/org webhooks.

    Runs outside any request, in its own session. Every failure is swallowed and
    logged so a bad webhook can never break activity recording or the listener.
    """
    try:
        async with session_factory() as session:
            await _dispatch(session, event)
            await session.commit()
    except Exception:
        logger.exception("Webhook dispatch failed for event {}", event.get("id"))


async def _dispatch(session: AsyncSession, event: dict[str, Any]) -> None:
    entity_type = str(event.get("entity_type") or "")
    event_type = str(event.get("event_type") or "")
    key = EVENT_MAP.get((entity_type, event_type))
    if key is None:
        return
    org_id = _opt_uuid(event.get("org_id"))
    if org_id is None:
        return
    project_id = _opt_uuid(event.get("project_id"))

    matched_keys = {key}
    if key == "task.status_changed" and await _is_task_completed(session, event):
        matched_keys.add("task.completed")

    if key in ORG_SCOPED_KEYS:
        query = select(ProjectWebhook).where(
            ProjectWebhook.org_id == org_id, ProjectWebhook.enabled.is_(True)
        )
    else:
        if project_id is None:
            return
        query = select(ProjectWebhook).where(
            ProjectWebhook.project_id == project_id, ProjectWebhook.enabled.is_(True)
        )
    webhooks = list(await session.scalars(query))
    if not webhooks:
        return

    base = get_settings().app_base_url.rstrip("/")
    actor_name = await _actor_name(session, _opt_uuid(event.get("actor_id")))

    for wh in webhooks:
        subscribed = matched_keys.intersection(wh.events)
        if not subscribed:
            continue
        delivery_key = "task.completed" if "task.completed" in subscribed else key
        await _deliver(session, wh, event, delivery_key, base, actor_name)


async def _is_task_completed(session: AsyncSession, event: dict[str, Any]) -> bool:
    entity_id = _opt_uuid(event.get("entity_id"))
    if entity_id is None:
        return False
    task = await session.get(Task, entity_id)
    if task is None:
        return False
    return STATUS_TO_CATEGORY[task.status] is StatusCategory.COMPLETED


async def _actor_name(session: AsyncSession, actor_id: uuid.UUID | None) -> str | None:
    if actor_id is None:
        return None
    user = await session.get(User, actor_id)
    return user.full_name if user is not None else None


async def _deliver(
    session: AsyncSession,
    wh: ProjectWebhook,
    event: dict[str, Any],
    key: str,
    base: str,
    actor_name: str | None,
) -> None:
    """Decrypt, render, send, and record one delivery. Never raises."""
    try:
        url = _decrypt_url(wh)
        try:
            detect_provider_and_validate(url)
        except Exception:
            logger.warning("Webhook {} URL is off the allowlist; skipping", wh.id)
            return
        rm = await enrich(session, event, key, base=base, actor_name=actor_name)
        payload = _payload_for(wh.provider, rm)
        raw_event_type = event.get("event_type")
        event_type = raw_event_type if isinstance(raw_event_type, str) else None
        ok, detail = await sender.send(
            wh.provider, url, payload, secret=wh.secret, event_type=event_type
        )
        _record_delivery(wh, ok=ok, detail=detail)
        await session.flush()
    except Exception:
        logger.exception("Failed to deliver webhook {}", wh.id)


async def enrich(
    session: AsyncSession,
    event: dict[str, Any],
    key: str,
    *,
    base: str,
    actor_name: str | None,
) -> RenderModel:
    """Load the event's entity and build a provider-neutral RenderModel."""
    entity_type = str(event.get("entity_type") or "")
    entity_id = _opt_uuid(event.get("entity_id"))
    label = EVENT_LABELS.get(key, key)
    category = category_for(key)

    if entity_type == "task" and entity_id is not None:
        rm = await _enrich_task(session, entity_id, base)
        if rm is not None:
            rm.event_label, rm.category, rm.actor_name = label, category, actor_name
            return rm
    elif entity_type == "project" and entity_id is not None:
        rm = await _enrich_project(session, entity_id, base)
        if rm is not None:
            rm.event_label, rm.category, rm.actor_name = label, category, actor_name
            return rm
    elif entity_type == "note" and entity_id is not None:
        note = await session.get(Note, entity_id)
        if note is not None:
            return RenderModel(
                title=note.title,
                url=f"{base}/n/{note.id}",
                category=category,
                event_label=label,
                actor_name=actor_name,
            )
    elif entity_type == "meeting" and entity_id is not None:
        meeting = await session.get(Meeting, entity_id)
        if meeting is not None:
            return RenderModel(
                title=meeting.title,
                url=f"{base}/m/{meeting.id}",
                category=category,
                event_label=label,
                actor_name=actor_name,
            )
    elif entity_type in {"organization", "team"} and entity_id is not None:
        org = await session.get(Organization, _opt_uuid(event.get("org_id")))
        return RenderModel(
            title=org.name if org is not None else entity_type,
            subtitle=label,
            category=category,
            event_label=label,
            actor_name=actor_name,
        )

    return RenderModel(
        title=f"{entity_type} {label}",
        category=category,
        event_label=label,
        actor_name=actor_name,
    )


async def _enrich_task(session: AsyncSession, task_id: uuid.UUID, base: str) -> RenderModel | None:
    task = await session.get(Task, task_id)
    if task is None:
        return None
    project = await session.get(Project, task.project_id)
    identifier = f"{project.key}-{task.number}" if project is not None else str(task.number)
    fields: list[tuple[str, str]] = [
        ("Status", task.status.value),
        ("Priority", task.priority.value),
    ]
    if task.assignee_id is not None:
        assignee = await session.get(User, task.assignee_id)
        if assignee is not None:
            fields.append(("Assignee", assignee.full_name))
    return RenderModel(
        title=f"{identifier}: {task.title}",
        url=f"{base}/t/{identifier}",
        category="updated",
        event_label="",
        fields=fields,
    )


async def _enrich_project(
    session: AsyncSession, project_id: uuid.UUID, base: str
) -> RenderModel | None:
    project = await session.get(Project, project_id)
    if project is None:
        return None
    return RenderModel(
        title=project.name,
        url=f"{base}/p/{project.key}",
        category="updated",
        event_label="",
    )
