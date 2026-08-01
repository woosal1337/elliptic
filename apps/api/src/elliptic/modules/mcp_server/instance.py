"""The shared FastMCP instance for the embedded CompanyOS MCP server."""

from fastmcp import FastMCP

INSTRUCTIONS = (
    "CompanyOS company brain. Read and write the organization's projects, tasks, "
    "meetings, notes, calendar events, and activity. Every action mirrors what a "
    "member can do in the web app and is scoped to the authenticated organization."
)

mcp: FastMCP = FastMCP(name="CompanyOS", instructions=INSTRUCTIONS)
