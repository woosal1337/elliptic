"""Editions & seat-based licensing (COS-197)."""

from httpx import AsyncClient

from tests.helpers import API, create_org, register_and_login


async def test_edition_and_plan_change(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)

    edition = await client.get(f"{API}/orgs/{org['id']}/billing/edition", headers=h)
    assert edition.status_code == 200, edition.text
    data = edition.json()["data"]
    assert data["plan"] == "free"
    assert data["seat_limit"] == 5
    assert data["billable_seats"] == 1
    assert data["over_seat_limit"] is False
    assert data["seats_remaining"] == 4
    assert "dashboards" not in data["features"]
    assert len(data["available_plans"]) == 4

    upgraded = await client.put(
        f"{API}/orgs/{org['id']}/billing/plan", json={"plan": "business"}, headers=h
    )
    assert upgraded.status_code == 200, upgraded.text
    up = upgraded.json()["data"]
    assert up["plan"] == "business"
    assert up["seat_limit"] == 200
    assert "sso" in up["features"]

    bad = await client.put(
        f"{API}/orgs/{org['id']}/billing/plan", json={"plan": "ultra"}, headers=h
    )
    assert bad.status_code == 400
