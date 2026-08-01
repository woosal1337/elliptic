"""Webhook request/response schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from elliptic.modules.webhooks.catalog import ALL_EVENT_KEYS

_MAX_EVENTS = 100


def _validate_event_keys(value: list[str]) -> list[str]:
    """Dedupe (order-preserving), reject unknown keys, and cap the subscription size."""
    seen: list[str] = []
    for key in value:
        if key not in ALL_EVENT_KEYS:
            msg = f"Unknown event key: {key}"
            raise ValueError(msg)
        if key not in seen:
            seen.append(key)
    if len(seen) > _MAX_EVENTS:
        msg = f"At most {_MAX_EVENTS} events may be subscribed"
        raise ValueError(msg)
    return seen


class WebhookCreateIn(BaseModel):
    """Create a project webhook. ``url`` is validated for provider in the service."""

    url: str
    name: str | None = None
    events: list[str]
    enabled: bool = True

    @field_validator("events")
    @classmethod
    def _check_events(cls, value: list[str]) -> list[str]:
        return _validate_event_keys(value)


class WebhookUpdateIn(BaseModel):
    """Partially update a project webhook."""

    url: str | None = None
    name: str | None = None
    events: list[str] | None = None
    enabled: bool | None = None

    @field_validator("events")
    @classmethod
    def _check_events(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return _validate_event_keys(value)


class WebhookOut(BaseModel):
    """Public view of a webhook. The destination URL is never exposed."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    provider: str
    name: str | None
    url_hint: str
    events: list[str]
    enabled: bool
    last_delivery_at: datetime | None
    last_delivery_status: str | None
    last_delivery_error: str | None
    created_at: datetime


class WebhookCreatedOut(WebhookOut):
    """Create response — exposes the signing secret exactly once."""

    signing_secret: str


class WebhookTestResult(BaseModel):
    """Outcome of a test delivery."""

    ok: bool
    status: str
    detail: str | None = None


class EventCatalogOut(BaseModel):
    """The full event catalog for the subscription UI."""

    groups: list[dict[str, Any]]
