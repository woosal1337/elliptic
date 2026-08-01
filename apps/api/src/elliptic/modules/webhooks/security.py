"""Webhook URL allowlisting and masking.

Only Slack and Discord incoming-webhook endpoints are accepted. Everything else
(localhost, link-local metadata, arbitrary hosts) is rejected, which closes the
SSRF surface that an attacker-controlled outbound URL would otherwise open.
"""

from urllib.parse import urlparse

from elliptic.core.crypto import last4
from elliptic.core.exceptions import BadRequestError

_SLACK_HOST = "hooks.slack.com"
_DISCORD_HOSTS = frozenset(
    {"discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"}
)
_DISCORD_PATH_PREFIX = "/api/webhooks/"

_UNSUPPORTED = "Unsupported webhook host; only Slack and Discord incoming webhooks are allowed"


def detect_provider_and_validate(url: str) -> str:
    """Return "slack" or "discord" for an allowlisted https webhook URL, else 400."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise BadRequestError(_UNSUPPORTED)
    host = parsed.hostname.lower()
    if host == _SLACK_HOST:
        return "slack"
    if host in _DISCORD_HOSTS and parsed.path.startswith(_DISCORD_PATH_PREFIX):
        return "discord"
    raise BadRequestError(_UNSUPPORTED)


def mask_url(url: str) -> str:
    """Return a non-secret hint for display: host plus the URL's last four chars."""
    parsed = urlparse(url)
    host = (parsed.hostname or "webhook").lower()
    return f"{host}/…{last4(url)}"
