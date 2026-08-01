"""Realtime co-editing token + access (COS-89).

The websocket relay convergence is validated live against a real server (two pycrdt
clients sync through /api/v1/ws/notes/{id}); here we cover the REST token surface.
"""

from httpx import AsyncClient

from elliptic.core.security import decode_token
from tests.helpers import API, register_and_login


async def test_realtime_token_is_minted_for_authed_user(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    me = (await client.get(f"{API}/users/me", headers=auth["headers"])).json()["data"]

    res = await client.get(f"{API}/realtime/token", headers=auth["headers"])
    assert res.status_code == 200, res.text
    token = res.json()["data"]["token"]
    assert str(decode_token(token, "access")) == me["id"]


async def test_realtime_token_requires_auth(client: AsyncClient) -> None:
    res = await client.get(f"{API}/realtime/token")
    assert res.status_code == 401
