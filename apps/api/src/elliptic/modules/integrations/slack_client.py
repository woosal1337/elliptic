"""Thin Slack Web API client over httpx, monkeypatchable in tests."""

import httpx

from elliptic.core.config import get_settings
from elliptic.core.exceptions import BadGatewayError


def _client(transport: httpx.AsyncBaseTransport | None = None) -> httpx.AsyncClient:
    settings = get_settings()
    return httpx.AsyncClient(
        base_url=settings.slack_base_url,
        timeout=settings.ai_timeout_seconds,
        transport=transport,
    )


def _require_ok(payload: dict[str, object]) -> dict[str, object]:
    if not payload.get("ok"):
        raise BadGatewayError(f"Slack API error: {payload.get('error', 'unknown')}")
    return payload


async def list_channels(
    token: str, *, transport: httpx.AsyncBaseTransport | None = None
) -> list[dict[str, str]]:
    """List the workspace's channels the bot can see."""
    async with _client(transport) as client:
        response = await client.get(
            "/conversations.list",
            params={"types": "public_channel,private_channel", "limit": 1000},
            headers={"Authorization": f"Bearer {token}"},
        )
    data = _require_ok(response.json())
    raw_channels = data.get("channels", [])
    channels = raw_channels if isinstance(raw_channels, list) else []
    return [
        {"id": str(channel["id"]), "name": str(channel["name"])}
        for channel in channels
        if isinstance(channel, dict)
    ]


async def post_message(
    token: str,
    channel_id: str,
    text: str,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> None:
    """Post a message to a Slack channel."""
    async with _client(transport) as client:
        response = await client.post(
            "/chat.postMessage",
            json={"channel": channel_id, "text": text},
            headers={"Authorization": f"Bearer {token}"},
        )
    _require_ok(response.json())


async def exchange_oauth_code(
    code: str, *, transport: httpx.AsyncBaseTransport | None = None
) -> dict[str, str]:
    """Exchange an OAuth code for a bot token and workspace identity."""
    settings = get_settings()
    async with _client(transport) as client:
        response = await client.post(
            "/oauth.v2.access",
            data={
                "code": code,
                "client_id": settings.slack_client_id,
                "client_secret": settings.slack_client_secret,
                "redirect_uri": settings.slack_redirect_uri,
            },
        )
    data = _require_ok(response.json())
    team = data.get("team", {})
    if not isinstance(team, dict) or "access_token" not in data:
        raise BadGatewayError("Slack OAuth response was malformed")
    return {
        "access_token": str(data["access_token"]),
        "team_id": str(team.get("id", "")),
        "team_name": str(team.get("name", "")),
    }
