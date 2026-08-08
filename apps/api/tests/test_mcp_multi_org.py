"""Multi-organization MCP targeting: every org-scoped tool must reach a chosen org.

A cross-org token falls back to the user's earliest-joined organization when a
tool takes no ``org_id``. A tool that omits the parameter is therefore not merely
missing an option — it is unreachable for every org but the first one.
"""

import ast
import pathlib
import re
from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport
from fastmcp.exceptions import ToolError
from httpx import AsyncClient

from elliptic.modules.mcp_server import app as mcp_app_module
from tests.helpers import API, create_org, create_project, create_task, register_and_login

TOOLS_DIR = pathlib.Path(mcp_app_module.__file__).parent
USER_LEVEL_TOOLS = frozenset({"create_org", "list_my_orgs", "get_my_profile", "update_my_profile"})


def _mcp_client(app: FastAPI, token: str) -> Client:
    def factory(**kwargs: Any) -> httpx.AsyncClient:
        kwargs.pop("base_url", None)
        return httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://mcp.test", **kwargs
        )

    return Client(
        StreamableHttpTransport(
            url="http://mcp.test/api/v1/mcp/",
            headers={"Authorization": f"Bearer {token}"},
            httpx_client_factory=factory,
        )
    )


async def _pat(client: AsyncClient, headers: dict[str, str]) -> str:
    response = await client.post(
        f"{API}/users/me/tokens", json={"name": "MCP key"}, headers=headers
    )
    assert response.status_code in (200, 201), response.text
    return str(response.json()["data"]["token"])


def _org_scoped_tools() -> list[tuple[str, ast.AsyncFunctionDef, str]]:
    """Every ``@mcp.tool`` function that resolves an org context, with its source."""
    found = []
    for path in sorted(TOOLS_DIR.glob("tools_*.py")):
        source = path.read_text()
        for node in ast.parse(source).body:
            if not isinstance(node, ast.AsyncFunctionDef):
                continue
            decorated = any(
                "mcp.tool" in ast.unparse(decorator) for decorator in node.decorator_list
            )
            body = ast.get_source_segment(source, node) or ""
            if not decorated or node.name in USER_LEVEL_TOOLS or "mcp_call(" not in body:
                continue
            found.append((node.name, node, body))
    return found


def test_tool_modules_are_discoverable() -> None:
    tools = _org_scoped_tools()
    assert len(tools) > 100
    assert any(name == "create_comment" for name, _, _ in tools)


def test_every_org_scoped_tool_accepts_org_id() -> None:
    """A tool that resolves an org context must let the caller choose which org."""
    offenders = [
        name
        for name, node, _ in _org_scoped_tools()
        if not any(arg.arg == "org_id" for arg in node.args.args + node.args.kwonlyargs)
    ]
    assert not offenders, f"org-scoped tools missing an org_id parameter: {sorted(offenders)}"


def test_org_scoped_tools_pass_org_id_through() -> None:
    """Declaring the parameter is not enough; it must reach mcp_call."""
    offenders = [
        name
        for name, _, body in _org_scoped_tools()
        if not re.search(r"mcp_call\([^)]*org_id=org_id", body)
    ]
    assert not offenders, f"org-scoped tools ignoring their org_id: {sorted(offenders)}"


async def test_comment_lands_in_the_targeted_org(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    first = await create_org(client, auth["headers"], name="First Org")
    second = await create_org(client, auth["headers"], name="Second Org")
    project = await create_project(client, auth["headers"], second["id"], key="SEC")
    task = await create_task(client, auth["headers"], second["id"], project["id"], "Needs a note")
    token = await _pat(client, auth["headers"])

    async with _mcp_client(app, token) as mcp_client:
        created = await mcp_client.call_tool(
            "create_comment",
            {
                "entity_type": "task",
                "entity_id": task["id"],
                "body": "Filed from the agent",
                "org_id": second["id"],
            },
        )
        assert created.data["content"] == "Filed from the agent"

        listed = await mcp_client.call_tool(
            "list_comments",
            {"entity_type": "task", "entity_id": task["id"], "org_id": second["id"]},
        )
        assert listed.data["total"] == 1

        with pytest.raises(ToolError):
            await mcp_client.call_tool(
                "create_comment",
                {
                    "entity_type": "task",
                    "entity_id": task["id"],
                    "body": "Wrong workspace",
                    "org_id": first["id"],
                },
            )


async def test_team_and_view_tools_reach_the_second_org(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    await create_org(client, auth["headers"], name="First Org")
    second = await create_org(client, auth["headers"], name="Second Org")
    token = await _pat(client, auth["headers"])

    async with _mcp_client(app, token) as mcp_client:
        team = await mcp_client.call_tool(
            "create_team", {"name": "Second Org Team", "org_id": second["id"]}
        )
        assert team.data["name"] == "Second Org Team"

        listed = await mcp_client.call_tool("list_teams", {"org_id": second["id"]})
        assert any(item["id"] == team.data["id"] for item in listed.data["items"])

        default_org_teams = await mcp_client.call_tool("list_teams", {})
        assert all(item["id"] != team.data["id"] for item in default_org_teams.data["items"])

        view = await mcp_client.call_tool(
            "create_view", {"name": "Second Org View", "org_id": second["id"]}
        )
        assert view.data["name"] == "Second Org View"


async def test_profile_tools_need_no_org(app: FastAPI, client: AsyncClient) -> None:
    """The profile belongs to the user, so it resolves without any organization."""
    auth = await register_and_login(client)
    token = await _pat(client, auth["headers"])

    async with _mcp_client(app, token) as mcp_client:
        profile = await mcp_client.call_tool("get_my_profile", {})
        assert profile.data["email"] == auth["email"]

        updated = await mcp_client.call_tool("update_my_profile", {"full_name": "Renamed User"})
        assert updated.data["full_name"] == "Renamed User"
