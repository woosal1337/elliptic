"""Provider-neutral render model and Slack/Discord payload builders.

``RenderModel`` is the single shape produced by ``service.enrich``. The two
``build_*`` functions translate it into Slack Block Kit and Discord embed JSON,
truncating defensively so a long title or field can never overflow a provider's
limits.
"""

from dataclasses import dataclass, field
from typing import Any

EVENT_STYLE: dict[str, dict[str, Any]] = {
    "created": {"color": 0x2ECC71, "emoji": "✅", "slack_btn": "primary"},
    "updated": {"color": 0x3498DB, "emoji": "🔄", "slack_btn": None},
    "status_changed": {"color": 0x3498DB, "emoji": "🔄", "slack_btn": None},
    "completed": {"color": 0x1ABC9C, "emoji": "🎉", "slack_btn": "primary"},
    "assigned": {"color": 0x9B59B6, "emoji": "👤", "slack_btn": None},
    "deleted": {"color": 0x95A5A6, "emoji": "🗑️", "slack_btn": None},
    "comment": {"color": 0xE67E22, "emoji": "💬", "slack_btn": None},
    "member": {"color": 0x9B59B6, "emoji": "👥", "slack_btn": None},
}

_DEFAULT_STYLE: dict[str, Any] = {"color": 0x5865F2, "emoji": "🔔", "slack_btn": None}

_TITLE_MAX = 256
_SUBTITLE_MAX = 2000
_FIELD_NAME_MAX = 256
_FIELD_VALUE_MAX = 1024
_SLACK_MAX_FIELDS = 10
_DISCORD_MAX_FIELDS = 25


def _style(category: str) -> dict[str, Any]:
    return EVENT_STYLE.get(category, _DEFAULT_STYLE)


def _truncate(value: str, limit: int) -> str:
    return value if len(value) <= limit else value[: limit - 1] + "…"


def _slack_field(name: str, value: str) -> str:
    return f"*{_truncate(name, _FIELD_NAME_MAX)}*\n{_truncate(value, _FIELD_VALUE_MAX)}"


@dataclass
class RenderModel:
    """The neutral payload an event renders into before provider formatting."""

    title: str
    category: str
    event_label: str
    subtitle: str | None = None
    url: str | None = None
    actor_name: str | None = None
    fields: list[tuple[str, str]] = field(default_factory=list)


def build_slack_payload(rm: RenderModel) -> dict[str, Any]:
    """Render a RenderModel into a Slack incoming-webhook Block Kit payload."""
    style = _style(rm.category)
    title = _truncate(rm.title, _TITLE_MAX)
    header_text = _truncate(f"{style['emoji']} {rm.event_label}", 150)
    blocks: list[dict[str, Any]] = [
        {"type": "header", "text": {"type": "plain_text", "text": header_text, "emoji": True}}
    ]
    title_md = f"*<{rm.url}|{title}>*" if rm.url else f"*{title}*"
    section: dict[str, Any] = {"type": "section", "text": {"type": "mrkdwn", "text": title_md}}
    blocks.append(section)
    if rm.subtitle:
        blocks.append(
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": _truncate(rm.subtitle, _SUBTITLE_MAX)},
            }
        )
    if rm.fields:
        blocks.append(
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": _slack_field(name, value)}
                    for name, value in rm.fields[:_SLACK_MAX_FIELDS]
                ],
            }
        )
    if rm.url:
        button: dict[str, Any] = {
            "type": "button",
            "text": {"type": "plain_text", "text": "Open", "emoji": True},
            "url": rm.url,
        }
        if style["slack_btn"]:
            button["style"] = style["slack_btn"]
        blocks.append({"type": "actions", "elements": [button]})
    blocks.append(
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"CompanyOS • {rm.actor_name or 'system'}"}],
        }
    )
    return {"text": _truncate(f"{rm.event_label}: {title}", 300), "blocks": blocks}


def build_discord_payload(rm: RenderModel) -> dict[str, Any]:
    """Render a RenderModel into a Discord incoming-webhook embed payload."""
    style = _style(rm.category)
    embed: dict[str, Any] = {
        "author": {"name": _truncate(f"{rm.actor_name or 'system'} • {rm.event_label}", 256)},
        "title": _truncate(rm.title, _TITLE_MAX),
        "color": style["color"],
        "footer": {"text": "CompanyOS"},
    }
    if rm.url:
        embed["url"] = rm.url
    if rm.subtitle:
        embed["description"] = _truncate(rm.subtitle, _SUBTITLE_MAX)
    if rm.fields:
        embed["fields"] = [
            {
                "name": _truncate(name, _FIELD_NAME_MAX),
                "value": _truncate(value, _FIELD_VALUE_MAX),
                "inline": True,
            }
            for name, value in rm.fields[:_DISCORD_MAX_FIELDS]
        ]
    return {"username": "CompanyOS", "embeds": [embed]}
