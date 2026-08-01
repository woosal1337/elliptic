"""Air-gapped mode: flag + egress block (COS-216)."""

import uuid as _uuid

from httpx import AsyncClient
from sqlalchemy import update

from elliptic.core.database import session_factory
from elliptic.modules.users.models import User
from tests.helpers import API, create_org, register_and_login

KEY = "sk-test-airgap-key-9988"


async def test_air_gapped_blocks_web_search(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    me = (await client.get(f"{API}/users/me", headers=h)).json()["data"]
    org = await create_org(client, h)
    await client.post(
        f"{API}/orgs/{org['id']}/ai/keys",
        json={"provider": "openai", "name": "p", "api_key": KEY, "is_default": True},
        headers=h,
    )

    async with session_factory() as s:
        await s.execute(
            update(User).where(User.id == _uuid.UUID(me["id"])).values(is_instance_admin=True)
        )
        await s.commit()

    settings = await client.get(f"{API}/instance/settings", headers=h)
    assert settings.json()["data"]["air_gapped"] is False

    upd = await client.patch(f"{API}/instance/settings", json={"air_gapped": True}, headers=h)
    assert upd.json()["data"]["air_gapped"] is True

    blocked = await client.post(
        f"{API}/orgs/{org['id']}/ai/web-search", json={"query": "anything"}, headers=h
    )
    assert blocked.status_code == 403, blocked.text
    assert "air-gapped" in blocked.json()["message"].lower()
