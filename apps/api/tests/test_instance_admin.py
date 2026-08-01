"""Instance admin / God Mode console (COS-223)."""

import uuid as _uuid

from httpx import AsyncClient
from sqlalchemy import update

from elliptic.core.database import session_factory
from elliptic.modules.users.models import User
from tests.helpers import API, register_and_login


async def _make_instance_admin(user_id: str) -> None:
    async with session_factory() as s:
        await s.execute(
            update(User).where(User.id == _uuid.UUID(user_id)).values(is_instance_admin=True)
        )
        await s.commit()


async def test_instance_admin_console(client: AsyncClient) -> None:
    admin = await register_and_login(client)
    ah = admin["headers"]
    admin_me = (await client.get(f"{API}/users/me", headers=ah)).json()["data"]
    victim = await register_and_login(client)
    vh = victim["headers"]
    victim_me = (await client.get(f"{API}/users/me", headers=vh)).json()["data"]

    assert (await client.get(f"{API}/instance/settings", headers=ah)).status_code == 403

    await _make_instance_admin(admin_me["id"])

    settings = await client.get(f"{API}/instance/settings", headers=ah)
    assert settings.status_code == 200, settings.text
    assert settings.json()["data"]["allow_workspace_creation"] is True
    upd = await client.patch(
        f"{API}/instance/settings",
        json={"instance_name": "Acme Cloud", "allow_workspace_creation": False},
        headers=ah,
    )
    assert upd.json()["data"]["instance_name"] == "Acme Cloud"

    blocked = await client.post(f"{API}/orgs", json={"name": "Blocked"}, headers=vh)
    assert blocked.status_code == 403

    users = await client.get(f"{API}/instance/users", headers=ah)
    assert any(u["email"] == victim_me["email"] for u in users.json()["data"])

    susp = await client.post(f"{API}/instance/users/{victim_me['id']}/suspend", headers=ah)
    assert susp.status_code == 200, susp.text
    assert (await client.get(f"{API}/users/me", headers=vh)).status_code == 401

    await client.post(f"{API}/instance/users/{victim_me['id']}/unsuspend", headers=ah)
    assert (await client.get(f"{API}/users/me", headers=vh)).status_code == 200

    await client.post(f"{API}/instance/users/{victim_me['id']}/grant-admin", headers=ah)
    assert (await client.get(f"{API}/instance/settings", headers=vh)).status_code == 200
    assert (
        await client.post(f"{API}/instance/users/{admin_me['id']}/revoke-admin", headers=ah)
    ).status_code == 400
