"""Get-started onboarding checklist (COS-136)."""

from httpx import AsyncClient

from tests.helpers import API, create_org, create_project, register_and_login


async def test_onboarding_progress_reflects_data(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    before = await client.get(f"{API}/orgs/{org['id']}/onboarding", headers=h)
    assert before.status_code == 200, before.text
    data = before.json()["data"]
    assert data["total"] == 4
    steps = {s["key"]: s["done"] for s in data["steps"]}
    assert steps["create_project"] is False

    await create_project(client, h, org["id"])
    after = await client.get(f"{API}/orgs/{org['id']}/onboarding", headers=h)
    after_steps = {s["key"]: s["done"] for s in after.json()["data"]["steps"]}
    assert after_steps["create_project"] is True
    assert after.json()["data"]["completed"] >= 1
    assert after.json()["data"]["complete"] is False
