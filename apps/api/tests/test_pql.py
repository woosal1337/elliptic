"""Plane Query Language: parser + executor + endpoints (COS-154)."""

import pytest
from httpx import AsyncClient

from elliptic.modules.pql.parser import PqlError, parse
from elliptic.modules.pql.service import validate_query
from tests.helpers import API, create_org, create_project, create_task, register_and_login


def test_parser_and_validation() -> None:
    parse('status = "todo" and (priority in ["high", "urgent"] or is_overdue())')
    parse("not has_no_assignee() and number > 3")
    validate_query('label in ["bug", "urgent"]')
    with pytest.raises(PqlError):
        parse("status = ")
    with pytest.raises(PqlError):
        validate_query("bogus_field = 1")
    with pytest.raises(PqlError):
        validate_query("made_up()")


async def test_pql_execute_endpoint(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"], key="QRY")
    hi = await create_task(client, h, org["id"], project["id"], title="Critical outage")
    await client.patch(
        f"{API}/orgs/{org['id']}/tasks/{hi['id']}", json={"priority": "urgent"}, headers=h
    )
    await create_task(client, h, org["id"], project["id"], title="Minor tweak")

    bad = await client.post(
        f"{API}/orgs/{org['id']}/pql/validate", json={"query": "nope = 1"}, headers=h
    )
    assert bad.json()["data"]["valid"] is False

    good = await client.post(
        f"{API}/orgs/{org['id']}/pql/validate",
        json={"query": 'priority = "urgent"'},
        headers=h,
    )
    assert good.json()["data"]["valid"] is True

    res = await client.post(
        f"{API}/orgs/{org['id']}/pql/execute",
        json={"query": 'priority = "urgent" and is_open()'},
        headers=h,
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["count"] == 1
    assert data["results"][0]["title"] == "Critical outage"
    assert data["results"][0]["identifier"].startswith("QRY-")

    res2 = await client.post(
        f"{API}/orgs/{org['id']}/pql/execute",
        json={"query": 'title ~ "tweak" or priority = "urgent"'},
        headers=h,
    )
    assert res2.json()["data"]["count"] == 2

    err = await client.post(
        f"{API}/orgs/{org['id']}/pql/execute", json={"query": "status = "}, headers=h
    )
    assert err.status_code == 400
