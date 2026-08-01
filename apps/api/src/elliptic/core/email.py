"""Outbound email delivery.

Sends via Resend (https://resend.com) over httpx when ``RESEND_API_KEY`` is set;
otherwise falls back to a logging sink so development and tests never send real
mail. ``deliver_email`` keeps a stable signature so every caller — the
notification job and the invitation flow — uses it the same way.
"""

from typing import Protocol

import httpx
from loguru import logger

from elliptic.core.config import get_settings

RESEND_ENDPOINT = "https://api.resend.com/emails"
_TIMEOUT_SECONDS = 10.0


class EmailSender(Protocol):
    """Callable contract for sending one email."""

    def __call__(
        self, to_email: str, subject: str, body: str, *, html: str | None = None
    ) -> None: ...


def deliver_email(to_email: str, subject: str, body: str, *, html: str | None = None) -> None:
    """Send an email via Resend, or log it when no API key is configured.

    A transport failure is logged but never raised, so a flaky provider cannot
    break the request that triggered the email (e.g. creating an invitation).
    """
    settings = get_settings()
    if not settings.resend_api_key:
        logger.info(
            "Email -> {}: {} ({} chars; RESEND_API_KEY unset, not sent)",
            to_email,
            subject,
            len(html or body),
        )
        return

    payload: dict[str, object] = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    if html:
        payload["html"] = html

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json=payload,
            timeout=_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        logger.error("Resend request failed for {}: {}", to_email, exc)
        return

    if response.is_error:
        logger.error(
            "Resend rejected email to {} ({}): {}",
            to_email,
            response.status_code,
            response.text[:500],
        )
    else:
        logger.info("Email sent to {} via Resend: {}", to_email, subject)
