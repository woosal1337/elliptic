"""Embedded MCP server tests: auth, scope gating, and tool parity."""

import base64
import hashlib
import uuid
from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport
from fastmcp.exceptions import ToolError
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.core.database import session_factory
from elliptic.modules.ai import service as ai_service
from elliptic.modules.ai.providers import CompletionResult
from elliptic.modules.mcp_auth import service
from tests.helpers import create_org, create_project, import_meeting, register_and_login

_REDIRECT = "http://127.0.0.1:7777/cb"


async def _mint_token(auth: dict[str, Any], org: dict[str, Any], scopes: list[str]) -> str:
    verifier = (
        base64.urlsafe_b64encode(uuid.uuid4().bytes + uuid.uuid4().bytes).rstrip(b"=").decode()
    )
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    )
    async with session_factory() as session:
        oauth_client = await service.register_client(
            session, client_name="Test Client", redirect_uris=[_REDIRECT]
        )
        await session.commit()
        client_id = oauth_client.client_id
    request = service.decode_authorization_request(
        service.sign_authorization_request(
            client_id=client_id,
            redirect_uri=_REDIRECT,
            code_challenge=challenge,
            code_challenge_method="S256",
            scope=scopes,
            resource=get_settings().mcp_resource_base,
            state=None,
        )
    )
    async with session_factory() as session:
        code = await service.issue_authorization_code(
            session,
            request=request,
            user_id=uuid.UUID(auth["user_id"]),
            org_id=uuid.UUID(org["id"]),
            scopes=scopes,
        )
        await session.commit()
    async with session_factory() as session:
        result = await service.exchange_code(
            session,
            code=code,
            code_verifier=verifier,
            redirect_uri=_REDIRECT,
            client_id=client_id,
            resource=get_settings().mcp_resource_base,
        )
        await session.commit()
    return result.access_token


def _mcp_client(app: FastAPI, token: str) -> Client:
    def factory(**kwargs: Any) -> httpx.AsyncClient:
        kwargs.pop("transport", None)
        kwargs.pop("base_url", None)
        return httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://mcp.test", **kwargs
        )

    transport = StreamableHttpTransport(
        url="http://mcp.test/api/v1/mcp/",
        headers={"Authorization": f"Bearer {token}"},
        httpx_client_factory=factory,
    )
    return Client(transport)


async def test_list_activity_tool_returns_org_feed(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["activity:read"])
    async with _mcp_client(app, token) as mcp_client:
        tools = await mcp_client.list_tools()
        assert any(tool.name == "list_activity" for tool in tools)
        result = await mcp_client.call_tool("list_activity", {})
    assert result.data["total"] >= 1
    assert any(item["entity_type"] == "organization" for item in result.data["items"])


async def test_tool_rejects_missing_scope(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["tasks:read"])
    async with _mcp_client(app, token) as mcp_client:
        with pytest.raises(ToolError):
            await mcp_client.call_tool("list_activity", {})


async def test_tool_rejects_invalid_token(app: FastAPI) -> None:
    async with _mcp_client(app, "not-a-real-token") as mcp_client:
        with pytest.raises(ToolError):
            await mcp_client.call_tool("list_activity", {})


async def test_task_tools_full_cycle(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    token = await _mint_token(auth, org, ["tasks:read", "tasks:write", "activity:read"])
    async with _mcp_client(app, token) as mcp_client:
        created = await mcp_client.call_tool(
            "create_task", {"project_id": project["id"], "title": "From the agent"}
        )
        task = created.data
        assert task["identifier"].startswith(project["key"])

        listed = await mcp_client.call_tool("list_project_tasks", {"project_id": project["id"]})
        assert any(item["id"] == task["id"] for item in listed.data["items"])

        moved = await mcp_client.call_tool(
            "transition_task_status", {"task_id": task["id"], "status": "in_progress"}
        )
        assert moved.data["status"] == "in_progress"

        feed = await mcp_client.call_tool("list_activity", {})
        assert any(item["entity_type"] == "task" for item in feed.data["items"])


async def test_task_tool_rejects_cross_org_project(app: FastAPI, client: AsyncClient) -> None:
    auth_a = await register_and_login(client)
    org_a = await create_org(client, auth_a["headers"])
    auth_b = await register_and_login(client)
    org_b = await create_org(client, auth_b["headers"])
    project_b = await create_project(client, auth_b["headers"], org_b["id"])
    token_a = await _mint_token(auth_a, org_a, ["tasks:read"])
    async with _mcp_client(app, token_a) as mcp_client:
        with pytest.raises(ToolError):
            await mcp_client.call_tool("list_project_tasks", {"project_id": project_b["id"]})


async def test_meeting_and_event_tools(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(
        auth, org, ["meetings:read", "meetings:write", "events:read", "events:write"]
    )
    async with _mcp_client(app, token) as mcp_client:
        imported = await mcp_client.call_tool(
            "import_folio_meeting",
            {
                "folio": {
                    "title": "Weekly sync",
                    "started_at": "2026-06-15T10:00:00+00:00",
                    "duration_seconds": 1800,
                    "attendees": ["Guest"],
                    "markdown": "# notes",
                    "segments": [
                        {"speaker": "A", "start_seconds": 0.0, "end_seconds": 5.0, "text": "hi"}
                    ],
                }
            },
        )
        meeting = imported.data
        assert meeting["title"] == "Weekly sync"

        listed = await mcp_client.call_tool("list_meetings", {})
        assert any(item["id"] == meeting["id"] for item in listed.data["items"])

        segments = await mcp_client.call_tool(
            "list_meeting_segments", {"meeting_id": meeting["id"]}
        )
        assert segments.data["total"] == 1

        created = await mcp_client.call_tool(
            "create_calendar_event",
            {
                "title": "Standup",
                "starts_at": "2026-06-16T09:00:00+00:00",
                "ends_at": "2026-06-16T09:15:00+00:00",
            },
        )
        event = created.data
        assert event["title"] == "Standup"

        events = await mcp_client.call_tool(
            "list_calendar_events",
            {"from_date": "2026-06-01T00:00:00+00:00", "to_date": "2026-06-30T00:00:00+00:00"},
        )
        assert any(item["id"] == event["id"] for item in events.data["items"])


async def test_destructive_delete_requires_confirmation(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    token = await _mint_token(auth, org, ["tasks:read", "tasks:write"])
    async with _mcp_client(app, token) as mcp_client:
        created = await mcp_client.call_tool(
            "create_task", {"project_id": project["id"], "title": "Doomed"}
        )
        task_id = created.data["id"]

        preview = await mcp_client.call_tool("delete_task", {"task_id": task_id})
        assert preview.data.get("requires_confirmation") is True

        still = await mcp_client.call_tool("get_task", {"task_id": task_id})
        assert still.data["id"] == task_id

        deleted = await mcp_client.call_tool("delete_task", {"task_id": task_id, "confirm": True})
        assert deleted.data["deleted"] is True

        with pytest.raises(ToolError):
            await mcp_client.call_tool("get_task", {"task_id": task_id})


async def test_create_task_idempotency(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    token = await _mint_token(auth, org, ["tasks:read", "tasks:write"])
    async with _mcp_client(app, token) as mcp_client:
        args = {"project_id": project["id"], "title": "Once", "idempotency_key": "abc-123"}
        first = await mcp_client.call_tool("create_task", args)
        second = await mcp_client.call_tool("create_task", args)
        assert first.data["id"] == second.data["id"]

        listed = await mcp_client.call_tool("list_project_tasks", {"project_id": project["id"]})
        matching = [item for item in listed.data["items"] if item["title"] == "Once"]
        assert len(matching) == 1


async def test_agent_management_tools(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["agents:read", "agents:write"])
    async with _mcp_client(app, token) as mcp_client:
        created = await mcp_client.call_tool(
            "create_ai_user",
            {
                "name": "Scout",
                "provider": "anthropic",
                "model": "claude-opus-4-8",
                "system_prompt": "You triage inbound tasks.",
            },
        )
        agent_id = created.data["id"]
        assert created.data["is_active"] is True

        budgeted = await mcp_client.call_tool(
            "set_ai_user_budget", {"ai_user_id": agent_id, "budget_monthly_cents": 5000}
        )
        assert budgeted.data["budget_monthly_cents"] == 5000

        paused = await mcp_client.call_tool("pause_ai_user", {"ai_user_id": agent_id})
        assert paused.data["is_active"] is False

        listed = await mcp_client.call_tool("list_ai_users", {})
        assert any(item["id"] == agent_id for item in listed.data["items"])


async def test_brain_tools(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"])
    token = await _mint_token(
        auth, org, ["tasks:read", "tasks:write", "brain:read", "activity:read"]
    )
    async with _mcp_client(app, token) as mcp_client:
        created = await mcp_client.call_tool(
            "create_task",
            {
                "project_id": project["id"],
                "title": "In flight",
                "assignee_id": auth["user_id"],
                "status": "in_progress",
            },
        )
        task_id = created.data["id"]

        threads = await mcp_client.call_tool("brain_open_threads", {})
        assert any(item["id"] == task_id for item in threads.data["assigned_to_me"])

        resume = await mcp_client.call_tool("brain_resume", {"project_id": project["id"]})
        assert resume.data["project"]["id"] == project["id"]
        assert any(item["id"] == task_id for item in resume.data["in_flight_tasks"])

        changes = await mcp_client.call_tool(
            "brain_changes_since", {"since": "2020-01-01T00:00:00+00:00"}
        )
        assert changes.data["count"] >= 1


async def test_ai_meeting_tools(
    app: FastAPI, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    class _FakeProvider:
        async def complete(self, messages: Any, *, model: str, max_tokens: int) -> CompletionResult:
            return CompletionResult(
                content="## Summary\n- did things", model=model, input_tokens=10, output_tokens=3
            )

    monkeypatch.setattr(
        ai_service,
        "get_provider",
        lambda provider, api_key, transport=None, base_url=None: _FakeProvider(),
    )

    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    key = await client.post(
        f"/api/v1/orgs/{org['id']}/ai/keys",
        json={
            "provider": "openai",
            "name": "primary",
            "api_key": "sk-test-aaaabbbbccccdddd",
            "is_default": True,
        },
        headers=auth["headers"],
    )
    assert key.status_code == 201, key.text
    meeting = await import_meeting(client, auth["headers"], org["id"])
    token = await _mint_token(auth, org, ["meetings:read", "meetings:write"])
    async with _mcp_client(app, token) as mcp_client:
        summary = await mcp_client.call_tool("summarize_meeting", {"meeting_id": meeting["id"]})
        assert "content" in summary.data

        answer = await mcp_client.call_tool(
            "ask_meeting", {"meeting_id": meeting["id"], "question": "What happened?"}
        )
        assert answer.data["reply"]


async def test_comment_attachments_visible_and_viewable_via_mcp(
    app: FastAPI, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Agents see comment attachments (with a URL) and can view images inline (COS-106 MCP)."""
    from elliptic.modules.storage import client as storage_client  # noqa: PLC0415
    from tests.helpers import API, create_task  # noqa: PLC0415

    settings = get_settings()
    monkeypatch.setattr(settings, "r2_endpoint_url", "https://acct.r2.cloudflarestorage.com")
    monkeypatch.setattr(settings, "r2_access_key_id", "k")
    monkeypatch.setattr(settings, "r2_secret_access_key", "s")
    monkeypatch.setattr(
        storage_client, "presigned_put", lambda key, ct, **kw: f"https://r2/put/{key}"
    )
    monkeypatch.setattr(storage_client, "presigned_get", lambda key, **kw: f"https://r2/get/{key}")

    async def fake_head(key: str) -> dict[str, object]:
        return {"size": 70, "etag": "e", "content_type": "image/png"}

    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d49444154789c63f8cfc0f01f0005000100ff5c2d2a0000000049454e44ae426082"
    )

    async def fake_bytes(key: str) -> bytes:
        return png

    monkeypatch.setattr(storage_client, "head_object", fake_head)
    monkeypatch.setattr(storage_client, "get_bytes", fake_bytes)

    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    task = await create_task(client, h, org["id"], project["id"], title="screenshot please")

    base = f"{API}/orgs/{org['id']}/storage"
    pres = await client.post(
        base + "/presign-upload",
        json={"filename": "shot.png", "content_type": "image/png", "size_bytes": 70},
        headers=h,
    )
    obj_id = pres.json()["data"]["object_id"]
    await client.post(f"{base}/objects/{obj_id}/confirm", headers=h)
    await client.post(
        f"{API}/orgs/{org['id']}/comments",
        json={
            "entity_type": "task",
            "entity_id": task["id"],
            "content": "see this",
            "attachment_ids": [obj_id],
        },
        headers=h,
    )

    token = await _mint_token(auth, org, ["comments:read"])
    async with _mcp_client(app, token) as mcp_client:
        listed = await mcp_client.call_tool(
            "list_comments", {"entity_type": "task", "entity_id": task["id"]}
        )
        data = listed.data
        attachments = data["items"][0]["attachments"]
        assert len(attachments) == 1
        assert attachments[0]["filename"] == "shot.png"
        assert attachments[0]["kind"] == "image"
        assert attachments[0]["url"]
        assert attachments[0]["url"].startswith("https://r2/get/")

        got = await mcp_client.call_tool("get_attachment", {"object_id": obj_id})
        assert got.data["download_url"].startswith("https://r2/get/")

        viewed = await mcp_client.call_tool("view_image_attachment", {"object_id": obj_id})
        blocks = viewed.content
        assert any(getattr(b, "type", None) == "image" for b in blocks), blocks
