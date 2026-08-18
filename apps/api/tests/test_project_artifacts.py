"""Project artifacts (MA-17) and event linked-notes counts (CAL-02-BE)."""

from httpx import AsyncClient

from tests.helpers import API, create_org, create_project, register_and_login


async def test_project_artifact_crud(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="ART")
    base = f"{API}/orgs/{org['id']}/projects/{project['id']}/artifacts"

    added = await client.post(
        base, json={"label": "Figma", "url": "https://figma.com/x"}, headers=auth["headers"]
    )
    assert added.status_code == 201, added.text
    artifact_id = added.json()["data"]["id"]

    listing = await client.get(base, headers=auth["headers"])
    assert [a["label"] for a in listing.json()["data"]] == ["Figma"]

    deleted = await client.delete(f"{base}/{artifact_id}", headers=auth["headers"])
    assert deleted.status_code == 200, deleted.text
    assert (await client.get(base, headers=auth["headers"])).json()["data"] == []
