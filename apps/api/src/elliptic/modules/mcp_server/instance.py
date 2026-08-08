"""The shared FastMCP instance for the embedded Elliptic MCP server."""

from fastmcp import FastMCP

INSTRUCTIONS = (
    "Elliptic company brain. Read and write the organization's projects, tasks, "
    "meetings, notes, calendar events, and activity. Every action mirrors what a "
    "member can do in the web app.\n\n"
    "A token may reach one organization or several. When it reaches several, every "
    "org-scoped tool takes an optional org_id, and omitting it falls back to the "
    "organization you joined first — which is rarely the one you mean. Call "
    "list_my_orgs once, then pass org_id on every call that targets a specific "
    "workspace. A tool that reports a record as missing is usually pointed at the "
    "wrong organization rather than looking at a deleted record."
)

mcp: FastMCP = FastMCP(name="Elliptic", instructions=INSTRUCTIONS)
