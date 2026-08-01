"""Curated marketplace registry aggregating Elliptic extension points (COS-273)."""

from elliptic.modules.mcp_connectors.catalog import CATALOG as CONNECTOR_CATALOG

_APPS: list[dict[str, str]] = [
    {
        "id": "slack",
        "category": "app",
        "name": "Slack",
        "description": "Post updates and run slash commands from Slack.",
        "install_kind": "settings:integrations",
    },
    {
        "id": "github-sync",
        "category": "app",
        "name": "GitHub sync",
        "description": "Turn issues into triage items and auto-close on PR merge.",
        "install_kind": "project:git",
    },
    {
        "id": "email-intake",
        "category": "app",
        "name": "Email to task",
        "description": "Forward emails into a project's triage queue.",
        "install_kind": "project:email-intake",
    },
]

_AGENTS: list[dict[str, str]] = [
    {
        "id": "ai-agent",
        "category": "agent",
        "name": "AI agent (bot user)",
        "description": "A non-billable AI teammate that can be assigned work and run tasks.",
        "install_kind": "settings:ai",
    },
]

_IMPORTERS: list[dict[str, str]] = [
    {
        "id": "csv-import",
        "category": "importer",
        "name": "CSV importer",
        "description": "Bulk-import work items from a CSV file.",
        "install_kind": "project:import",
    },
]


def registry() -> list[dict[str, str]]:
    connectors = [
        {
            "id": f"connector-{c['key']}",
            "category": "connector",
            "name": c["name"],
            "description": c["description"],
            "install_kind": "settings:connectors",
        }
        for c in CONNECTOR_CATALOG
    ]
    return [*_APPS, *_AGENTS, *_IMPORTERS, *connectors]
