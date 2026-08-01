"""Curated catalog of remote MCP servers a workspace can connect to (COS-228)."""

CATALOG: list[dict[str, str]] = [
    {
        "key": "github",
        "name": "GitHub",
        "transport": "http",
        "endpoint_url": "https://api.githubcopilot.com/mcp/",
        "auth_type": "bearer",
        "docs_url": "https://github.com/github/github-mcp-server",
        "description": "Issues, pull requests, repositories, and code search.",
    },
    {
        "key": "linear",
        "name": "Linear",
        "transport": "http",
        "endpoint_url": "https://mcp.linear.app/mcp",
        "auth_type": "bearer",
        "docs_url": "https://linear.app/docs/mcp",
        "description": "Linear issues, projects, and cycles.",
    },
    {
        "key": "notion",
        "name": "Notion",
        "transport": "http",
        "endpoint_url": "https://mcp.notion.com/mcp",
        "auth_type": "bearer",
        "docs_url": "https://developers.notion.com",
        "description": "Notion pages, databases, and search.",
    },
    {
        "key": "sentry",
        "name": "Sentry",
        "transport": "http",
        "endpoint_url": "https://mcp.sentry.dev/mcp",
        "auth_type": "bearer",
        "docs_url": "https://docs.sentry.io",
        "description": "Sentry issues and error events.",
    },
    {
        "key": "custom",
        "name": "Custom MCP server",
        "transport": "http",
        "endpoint_url": "",
        "auth_type": "header",
        "docs_url": "https://modelcontextprotocol.io",
        "description": "Connect any HTTP/SSE Model Context Protocol server.",
    },
]

_BY_KEY = {entry["key"]: entry for entry in CATALOG}


def catalog_entry(key: str) -> dict[str, str] | None:
    return _BY_KEY.get(key)
