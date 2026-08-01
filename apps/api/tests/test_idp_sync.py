"""IdP group sync: mappings + reconcile (COS-181)."""

import uuid as _uuid

from httpx import AsyncClient
from sqlalchemy import select

from elliptic.core.database import session_factory
from elliptic.modules.idp_sync.service import reconcile
from elliptic.modules.projects.models import ProjectMember
from tests.helpers import API, add_org_member, create_org, create_project, register_and_login


async def test_group_mapping_and_reconcile(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    oh = owner["headers"]
    org = await create_org(client, oh)
    member = await register_and_login(client)
    await add_org_member(client, oh, org["id"], member)
    member_me = (await client.get(f"{API}/users/me", headers=member["headers"])).json()["data"]

    proj_a = await create_project(client, oh, org["id"], key="AAA")
    proj_b = await create_project(client, oh, org["id"], key="BBB")
    base = f"{API}/orgs/{org['id']}/idp-sync"

    for group, pid, role in [
        ("engineering", proj_a["id"], "admin"),
        ("staff", proj_a["id"], "member"),
        ("design", proj_b["id"], "viewer"),
    ]:
        r = await client.post(
            base + "/mappings",
            json={"idp_group": group, "project_id": pid, "role": role},
            headers=oh,
        )
        assert r.status_code == 201, r.text
    assert len((await client.get(base + "/mappings", headers=oh)).json()["data"]) == 3

    preview = await client.post(
        base + "/preview",
        json={"user_id": member_me["id"], "groups": ["engineering", "staff"]},
        headers=oh,
    )
    assert preview.status_code == 200, preview.text
    adds = preview.json()["data"]["adds"]
    a_add = next(a for a in adds if a["project_id"] == proj_a["id"])
    assert a_add["role"] == "admin"
    assert all(a["project_id"] != proj_b["id"] for a in adds)

    async with session_factory() as s:
        diff = await reconcile(s, _uuid.UUID(org["id"]), _uuid.UUID(member_me["id"]), ["design"])
        await s.commit()
        pm = await s.scalar(
            select(ProjectMember).where(
                ProjectMember.user_id == _uuid.UUID(member_me["id"]),
                ProjectMember.project_id == _uuid.UUID(proj_b["id"]),
            )
        )
        assert pm is not None
        assert pm.role.value == "viewer"
        assert pm.source == "synced"
    assert len(diff["adds"]) == 1
