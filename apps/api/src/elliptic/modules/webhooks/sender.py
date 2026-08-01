"""Outbound webhook delivery over httpx. Never raises into the dispatcher.

Generic (non-Slack/Discord) deliveries are signed with HMAC-SHA256 over a
``"{timestamp}.{body}"`` string so receivers can verify authenticity and reject
replays. Transient failures (HTTP 429/5xx) are retried with exponential backoff.
"""

import asyncio
import hashlib
import hmac
import json
import time
from typing import Any

import httpx

from elliptic.core.config import get_settings

_SLACK_OK_STATUS = 200
_SLACK_OK_BODY = "ok"
_DISCORD_OK_STATUSES = (200, 204)

_MAX_ATTEMPTS = 3
_BACKOFF_BASE_SECONDS = 0.5
_TOO_MANY_REQUESTS = 429
_SERVER_ERROR_FLOOR = 500


def compute_signature(secret: str, timestamp: str, body: bytes) -> str:
    """HMAC-SHA256 of ``"{timestamp}.{body}"`` as ``sha256=<hex>``."""
    mac = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def _evaluate(provider: str, response: httpx.Response) -> tuple[bool, str]:
    if provider == "slack":
        ok = response.status_code == _SLACK_OK_STATUS and response.text == _SLACK_OK_BODY
        return ok, f"{response.status_code} {response.text[:120]}"
    if provider == "discord":
        return response.status_code in _DISCORD_OK_STATUSES, str(response.status_code)
    return not response.is_error, str(response.status_code)


def _is_retryable(response: httpx.Response) -> bool:
    return response.status_code == _TOO_MANY_REQUESTS or response.status_code >= _SERVER_ERROR_FLOOR


async def send(
    provider: str,
    url: str,
    payload: dict[str, Any],
    *,
    secret: str | None = None,
    event_type: str | None = None,
) -> tuple[bool, str]:
    """POST ``payload`` to ``url``, signing + retrying. Return ``(ok, detail)``; never raises."""
    body = json.dumps(payload, separators=(",", ":")).encode()
    headers = {"Content-Type": "application/json"}
    if secret:
        timestamp = str(int(time.time()))
        headers["X-CompanyOS-Timestamp"] = timestamp
        headers["X-CompanyOS-Signature"] = compute_signature(secret, timestamp, body)
        if event_type:
            headers["X-CompanyOS-Event"] = event_type

    last_detail = "no attempt made"
    async with httpx.AsyncClient(timeout=get_settings().notify_timeout_seconds) as client:
        for attempt in range(_MAX_ATTEMPTS):
            try:
                response = await client.post(url, content=body, headers=headers)
            except httpx.HTTPError as exc:
                return False, str(exc)
            ok, last_detail = _evaluate(provider, response)
            if ok or not _is_retryable(response) or attempt == _MAX_ATTEMPTS - 1:
                return ok, last_detail
            await asyncio.sleep(_BACKOFF_BASE_SECONDS * (2**attempt))
    return False, last_detail
