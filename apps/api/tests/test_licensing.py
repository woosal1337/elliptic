"""Offline license keys (COS-230)."""

import uuid as _uuid

from httpx import AsyncClient
from sqlalchemy import update

from elliptic.core.database import session_factory
from elliptic.modules.users.models import User
from tests.helpers import API, register_and_login


async def test_license_issue_activate_delink(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    me = (await client.get(f"{API}/users/me", headers=h)).json()["data"]
    async with session_factory() as s:
        await s.execute(
            update(User).where(User.id == _uuid.UUID(me["id"])).values(is_instance_admin=True)
        )
        await s.commit()

    assert (await client.get(f"{API}/instance/license", headers=h)).json()["data"] is None

    issued = await client.post(
        f"{API}/instance/license/issue",
        json={"plan": "business", "seats": 200, "licensee": "Acme", "days": 365},
        headers=h,
    )
    assert issued.status_code == 200, issued.text
    token = issued.json()["data"]["token"]

    activated = await client.post(
        f"{API}/instance/license/activate", json={"token": token}, headers=h
    )
    assert activated.status_code == 200, activated.text
    assert activated.json()["data"]["plan"] == "business"
    assert activated.json()["data"]["seats"] == 200
    assert activated.json()["data"]["active"] is True

    cur = await client.get(f"{API}/instance/license", headers=h)
    assert cur.json()["data"]["licensee"] == "Acme"

    bad = await client.post(
        f"{API}/instance/license/activate", json={"token": token + "x"}, headers=h
    )
    assert bad.status_code == 400

    assert (await client.delete(f"{API}/instance/license", headers=h)).status_code == 200
    assert (await client.get(f"{API}/instance/license", headers=h)).json()["data"] is None
