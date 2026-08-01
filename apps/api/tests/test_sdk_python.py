"""Elliptic Python SDK smoke test (COS-219)."""

import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sdk" / "python"))

import elliptic_sdk as elliptic


def _client(handler) -> elliptic.EllipticClient:
    client = elliptic.EllipticClient("https://api.example.com", token="cos_pat_x")
    client._http = httpx.Client(  # type: ignore[attr-defined]
        base_url="https://api.example.com/api/v1",
        headers={"x-api-key": "cos_pat_x"},
        transport=httpx.MockTransport(handler),
    )
    return client


def test_sdk_sends_api_key_and_unwraps_envelope() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["api_key"] = request.headers.get("x-api-key")
        return httpx.Response(200, json={"success": True, "data": {"email": "a@b.com"}})

    with _client(handler) as cos:
        me = cos.me()
    assert me == {"email": "a@b.com"}
    assert seen["path"] == "/api/v1/users/me"
    assert seen["api_key"] == "cos_pat_x"


def test_sdk_raises_on_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"success": False, "message": "Not found"})

    with _client(handler) as cos, pytest.raises(elliptic.EllipticError) as exc:
        cos.projects("org-1")
    assert exc.value.status_code == 404
