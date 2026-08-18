"""Transcript chapters (MA-07) and pre-meeting brief (CAL-03)."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from elliptic.modules.meetings.service import compute_chapters
from tests.helpers import API, create_org, register_and_login


async def _import(
    client: AsyncClient, headers: dict[str, str], org_id: str, title: str, count: int
) -> dict[str, str]:
    payload = {
        "title": title,
        "started_at": datetime.now(UTC).isoformat(),
        "duration_seconds": count * 10,
        "attendees": [],
        "segments": [
            {
                "speaker": "A",
                "start_seconds": i * 10.0,
                "end_seconds": i * 10.0 + 9,
                "text": f"Topic {i} discussion point about the roadmap",
            }
            for i in range(count)
        ],
    }
    response = await client.post(
        f"{API}/orgs/{org_id}/meetings/import", json=payload, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_compute_chapters_empty_for_short_transcript() -> None:
    assert compute_chapters([]) == []


async def test_chapters_for_long_meeting(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    meeting = await _import(client, auth["headers"], org["id"], "Long sync", 12)
    response = await client.get(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/chapters", headers=auth["headers"]
    )
    assert response.status_code == 200, response.text
    chapters = response.json()["data"]
    assert 2 <= len(chapters) <= 8
    assert all(c["label"] and c["segment_id"] for c in chapters)
    starts = [c["start_seconds"] for c in chapters]
    assert starts == sorted(starts)


async def test_chapters_empty_for_short_meeting(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    meeting = await _import(client, auth["headers"], org["id"], "Short", 3)
    response = await client.get(
        f"{API}/orgs/{org['id']}/meetings/{meeting['id']}/chapters", headers=auth["headers"]
    )
    assert response.json()["data"] == []


async def _create_event(
    client: AsyncClient, headers: dict[str, str], org_id: str, title: str
) -> str:
    start = datetime.now(UTC) + timedelta(days=1)
    response = await client.post(
        f"{API}/orgs/{org_id}/events",
        json={
            "title": title,
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=1)).isoformat(),
            "visibility": "team",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]["id"]
