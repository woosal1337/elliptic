"""Inbound Sentry alert intake (COS-260)."""

from httpx import AsyncClient

from tests.helpers import API, create_org, create_project, register_and_login


async def test_sentry_alert_creates_a_bug(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])
    sbase = f"{API}/orgs/{org['id']}/projects/{project['id']}/sentry"

    created = await client.post(sbase, headers=h)
    assert created.status_code == 201, created.text
    token = created.json()["data"]["token"]

    res = await client.post(
        f"{API}/integrations/sentry/{token}",
        json={
            "data": {
                "issue": {
                    "title": "TypeError: undefined is not a function",
                    "level": "fatal",
                    "culprit": "app/checkout.js",
                    "web_url": "https://sentry.io/issue/1",
                }
            }
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["data"]["reference"].startswith(project["key"])

    tasks = await client.get(f"{API}/orgs/{org['id']}/tasks/all", headers=h)
    bug = next(t for t in tasks.json()["data"]["items"] if t["title"].startswith("TypeError"))
    assert bug["kind"] == "bug"
    assert bug["severity"] == "critical"
