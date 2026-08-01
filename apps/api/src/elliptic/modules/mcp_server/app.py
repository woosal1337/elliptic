"""The embedded Elliptic MCP server: a stateless FastMCP app over the services."""

from typing import Any

from elliptic.modules.mcp_server import (
    tools_activity,  # noqa: F401
    tools_agents,  # noqa: F401
    tools_automation,  # noqa: F401
    tools_brain,  # noqa: F401
    tools_comments,  # noqa: F401
    tools_events,  # noqa: F401
    tools_integrations,  # noqa: F401
    tools_meeting_templates,  # noqa: F401
    tools_meetings,  # noqa: F401
    tools_notes,  # noqa: F401
    tools_notifications,  # noqa: F401
    tools_orgs,  # noqa: F401
    tools_profile,  # noqa: F401
    tools_projects,  # noqa: F401
    tools_tasks,  # noqa: F401
    tools_teams,  # noqa: F401
    tools_triage,  # noqa: F401
    tools_views,  # noqa: F401
    tools_vocabulary,  # noqa: F401
    tools_workflow,  # noqa: F401
)
from elliptic.modules.mcp_server.instance import mcp


def build_mcp_app(stateless_http: bool = True) -> Any:
    """Return the ASGI app for the embedded MCP server, mounted under /api/v1/mcp."""
    return mcp.http_app(path="/", stateless_http=stateless_http, json_response=True)
