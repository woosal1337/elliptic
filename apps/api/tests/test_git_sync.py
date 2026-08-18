"""GitHub issue/PR sync (COS-256)."""

from httpx import AsyncClient

from tests.helpers import API, create_org, create_project, create_task, register_and_login


async def test_git_issue_pr_sync(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="GH")
    base = f"{API}/orgs/{org['id']}/projects/{project['id']}/git"

    conn = await client.post(base, json={"owner": "acme", "repo": "app"}, headers=h)
    assert conn.status_code == 201, conn.text
    token = conn.json()["data"]["token"]
    receiver = f"{API}/integrations/git/{token}"

    issue = await client.post(
        receiver,
        json={"action": "opened", "issue": {"id": 99, "title": "Crash on login", "body": "stack"}},
        headers={"X-GitHub-Event": "issues"},
    )
    assert issue.status_code == 202, issue.text
    assert issue.json()["data"]["action"] == "created"
    tasks = await client.get(f"{API}/orgs/{org['id']}/tasks/all", headers=h)
    items = (
        tasks.json()["data"]["items"]
        if isinstance(tasks.json()["data"], dict)
        else tasks.json()["data"]
    )
    assert any(t["title"] == "Crash on login" for t in items)

    task = await create_task(client, h, org["id"], project["id"], title="Build feature")
    ident = task["identifier"]
    pr = await client.post(
        receiver,
        json={
            "action": "closed",
            "pull_request": {
                "merged": True,
                "title": f"Implement feature (closes {ident})",
                "body": "",
                "html_url": "https://github.com/acme/app/pull/5",
                "head": {"ref": "feature"},
            },
        },
        headers={"X-GitHub-Event": "pull_request"},
    )
    assert pr.status_code == 202, pr.text
    assert ident.upper() in pr.json()["data"]["linked"]
    assert pr.json()["data"]["closed"] is True
    refreshed = await client.get(f"{API}/orgs/{org['id']}/tasks/{task['id']}", headers=h)
    assert refreshed.json()["data"]["status"] == "done"
    links = await client.get(f"{API}/orgs/{org['id']}/tasks/{task['id']}/links", headers=h)
    assert any("pull/5" in link["url"] for link in links.json()["data"])

    branch = await client.get(f"{API}/orgs/{org['id']}/tasks/{task['id']}/git-branch", headers=h)
    assert branch.json()["data"]["branch_name"].startswith("gh-")
