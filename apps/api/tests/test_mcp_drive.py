"""Drive over MCP: an agent uploads, browses, reads and deletes documents (COS-409)."""

import base64

import pytest
from fastapi import FastAPI
from fastmcp.exceptions import ToolError
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.modules.storage import client as storage_client
from tests.helpers import create_org, register_and_login
from tests.test_mcp_server import _mcp_client, _mint_token


@pytest.fixture(autouse=True)
def _configure_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub R2 with an in-memory bucket so an agent can round-trip real bytes."""
    settings = get_settings()
    monkeypatch.setattr(settings, "r2_endpoint_url", "https://acct.r2.cloudflarestorage.com")
    monkeypatch.setattr(settings, "r2_access_key_id", "k")
    monkeypatch.setattr(settings, "r2_secret_access_key", "s")

    bucket: dict[str, bytes] = {}

    monkeypatch.setattr(
        storage_client, "presigned_put", lambda key, ct, **kw: f"https://r2.test/put/{key}"
    )
    monkeypatch.setattr(
        storage_client, "presigned_get", lambda key, **kw: f"https://r2.test/get/{key}"
    )

    async def fake_put(key: str, data: bytes, content_type: str) -> None:
        bucket[key] = data

    async def fake_head(key: str) -> dict[str, object]:
        return {"size": len(bucket.get(key, b"x" * 64)), "etag": "e", "content_type": "text/plain"}

    async def fake_get(key: str) -> bytes | None:
        return bucket.get(key)

    async def fake_delete(key: str) -> None:
        bucket.pop(key, None)

    monkeypatch.setattr(storage_client, "put_bytes", fake_put)
    monkeypatch.setattr(storage_client, "head_object", fake_head)
    monkeypatch.setattr(storage_client, "get_bytes", fake_get)
    monkeypatch.setattr(storage_client, "delete_object", fake_delete)


async def test_agent_uploads_reads_and_deletes_a_document(
    app: FastAPI, client: AsyncClient
) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["drive:read", "drive:write"])

    body = "Clause 1. The agent may read this.\nClause 2. And cite it."
    async with _mcp_client(app, token) as mcp:
        uploaded = await mcp.call_tool(
            "upload_drive_file_inline",
            {
                "filename": "terms.txt",
                "content_base64": base64.b64encode(body.encode()).decode(),
                "content_type": "text/plain",
                "name": "Acme terms",
                "folder_path": "contracts/2026",
            },
        )
        file = uploaded.data
        assert file["name"] == "Acme terms"
        assert file["folder_path"] == "contracts/2026"
        # The mention string is what gets pasted into a task description.
        assert file["mention"] == f"[Acme terms](/__mention/file/{file['id']})"

        listed = await mcp.call_tool("list_drive_files", {"search": "acme"})
        assert [item["id"] for item in listed.data["items"]] == [file["id"]]

        folders = await mcp.call_tool("list_drive_folders", {})
        assert folders.data["items"] == [
            {"path": "contracts/2026", "name": "2026", "file_count": 1}
        ]

        read = await mcp.call_tool("read_drive_file", {"file_id": file["id"]})
        assert read.data["readable"] is True
        assert read.data["text"] == body
        assert read.data["truncated"] is False

        window = await mcp.call_tool(
            "read_drive_file", {"file_id": file["id"], "offset": 0, "limit": 8}
        )
        assert window.data["text"] == body[:8]
        assert window.data["truncated"] is True

        fetched = await mcp.call_tool("get_drive_file", {"file_id": file["id"]})
        assert fetched.data["url"].startswith("https://r2.test/get/")

        preview = await mcp.call_tool("delete_drive_file", {"file_id": file["id"]})
        assert preview.data["requires_confirmation"] is True
        confirmed = await mcp.call_tool(
            "delete_drive_file", {"file_id": file["id"], "confirm": True}
        )
        assert confirmed.data["deleted"] is True

        empty = await mcp.call_tool("list_drive_files", {})
        assert empty.data["total"] == 0


async def test_presigned_upload_path_reports_the_headers_to_send(
    app: FastAPI, client: AsyncClient
) -> None:
    """The big-file path: reserve, PUT the bytes yourself, then register."""
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["drive:read", "drive:write"])

    async with _mcp_client(app, token) as mcp:
        reserved = await mcp.call_tool(
            "create_drive_upload",
            {"filename": "plan.pdf", "content_type": "application/pdf", "size_bytes": 4096},
        )
        assert reserved.data["method"] == "PUT"
        assert reserved.data["headers"] == {"Content-Type": "application/pdf"}
        assert reserved.data["max_bytes"] == 100 * 1024 * 1024
        assert reserved.data["upload_url"].startswith("https://r2.test/put/")

        registered = await mcp.call_tool(
            "register_drive_file",
            {"object_id": reserved.data["object_id"], "name": "Floor plan"},
        )
        assert registered.data["name"] == "Floor plan"
        assert registered.data["folder_path"] == ""

        # A PDF has no text layer here, so the agent is told to fetch the URL.
        read = await mcp.call_tool("read_drive_file", {"file_id": registered.data["id"]})
        assert read.data["readable"] is False
        assert read.data["url"].startswith("https://r2.test/get/")
        assert "not plain text" in read.data["reason"]


async def test_move_and_rename_over_mcp(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["drive:read", "drive:write"])

    async with _mcp_client(app, token) as mcp:
        created = await mcp.call_tool(
            "upload_drive_file_inline",
            {
                "filename": "draft.txt",
                "content_base64": base64.b64encode(b"draft").decode(),
                "content_type": "text/plain",
                "folder_path": "legal",
                "description": "first pass",
            },
        )
        moved = await mcp.call_tool(
            "update_drive_file",
            {
                "file_id": created.data["id"],
                "name": "Signed MSA",
                "folder_path": "contracts/2026",
                "clear_description": True,
            },
        )
        assert moved.data["name"] == "Signed MSA"
        assert moved.data["folder_path"] == "contracts/2026"
        assert moved.data["description"] is None


async def test_inline_upload_refuses_a_large_payload(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["drive:read", "drive:write"])

    async with _mcp_client(app, token) as mcp:
        with pytest.raises(ToolError, match="inline limit"):
            await mcp.call_tool(
                "upload_drive_file_inline",
                {
                    "filename": "big.txt",
                    "content_base64": base64.b64encode(b"x" * (256 * 1024 + 1)).decode(),
                    "content_type": "text/plain",
                },
            )


async def test_read_scope_cannot_write(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["drive:read"])

    async with _mcp_client(app, token) as mcp:
        assert (await mcp.call_tool("list_drive_files", {})).data["total"] == 0
        with pytest.raises(ToolError):
            await mcp.call_tool(
                "create_drive_upload",
                {"filename": "x.pdf", "content_type": "application/pdf", "size_bytes": 10},
            )


async def test_drive_tools_need_a_drive_scope(app: FastAPI, client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    token = await _mint_token(auth, org, ["tasks:read"])

    async with _mcp_client(app, token) as mcp:
        with pytest.raises(ToolError):
            await mcp.call_tool("list_drive_files", {})
