"""Slack slash command -> work item (COS-266)."""

import hashlib
import hmac

from httpx import AsyncClient

from elliptic.core.database import session_factory
from elliptic.modules.integrations.models import SlackConnection
from elliptic.modules.integrations.slack_commands import verify_slack_signature
from tests.helpers import API, create_org, create_project, register_and_login

SIGNING_SECRET = "test-signing-secret"


def _sign(timestamp: str, body: str) -> str:
    digest = hmac.new(
        SIGNING_SECRET.encode(), f"v0:{timestamp}:{body}".encode(), hashlib.sha256
    ).hexdigest()
    return f"v0={digest}"


def test_signature_verification_roundtrip() -> None:
    body = "team_id=T1&text=hi"
    ts = "1700000000"
    sig = _sign(ts, body)
    assert verify_slack_signature(SIGNING_SECRET, ts, body, sig, now=1700000010) is True
    assert verify_slack_signature(SIGNING_SECRET, ts, body, "v0=bad", now=1700000010) is False
    assert verify_slack_signature(SIGNING_SECRET, ts, body, sig, now=1700001000) is False


async def test_slash_command_creates_triage_task(client: AsyncClient, monkeypatch) -> None:
    from elliptic.core.config import get_settings  # noqa: PLC0415

    get_settings.cache_clear()  # type: ignore[attr-defined]
    monkeypatch.setenv("SLACK_SIGNING_SECRET", SIGNING_SECRET)
    get_settings.cache_clear()  # type: ignore[attr-defined]

    auth = await register_and_login(client)
    h = auth["headers"]
    org = await create_org(client, h)
    project = await create_project(client, h, org["id"])

    async with session_factory() as session:
        session.add(
            SlackConnection(
                org_id=org["id"],
                team_id="TWORKSPACE",
                team_name="Acme",
                encrypted_token=b"x",
                nonce=b"y",
                default_project_id=project["id"],
            )
        )
        await session.commit()

    body = "team_id=TWORKSPACE&text=Fix the login page"
    ts = "1700000000"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Slack-Request-Timestamp": ts,
        "X-Slack-Signature": _sign(ts, body),
    }
    import time as _time  # noqa: PLC0415

    monkeypatch.setattr(_time, "time", lambda: 1700000010)
    res = await client.post(f"{API}/integrations/slack/commands", content=body, headers=headers)
    assert res.status_code == 200, res.text
    assert "Created" in res.json()["text"]

    triage = await client.get(f"{API}/orgs/{org['id']}/triage", headers=h)
    assert any(t["title"] == "Fix the login page" for t in triage.json()["data"])

    get_settings.cache_clear()  # type: ignore[attr-defined]
