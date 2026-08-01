"""Project webhook integration tests (SSRF allowlist, masking, CRUD, dispatch)."""

import hashlib
import hmac
import uuid
from typing import Any

import pytest
from httpx import AsyncClient

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.database import session_factory
from elliptic.modules.webhooks import sender, service
from elliptic.modules.webhooks.models import ProjectWebhook
from tests.helpers import (
    API,
    add_org_member,
    create_org,
    create_project,
    register_and_login,
)

SLACK_URL = "https://hooks.slack.com/services/T000/B000/XXXXYYYYZZZZ"
DISCORD_URL = "https://discord.com/api/webhooks/123456789/abcdefABCDEF-token"


def _webhooks_base(org_id: str, project_id: str) -> str:
    return f"{API}/orgs/{org_id}/projects/{project_id}/webhooks"


async def _setup(client: AsyncClient) -> tuple[dict[str, str], str, str]:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="WHK")
    return auth["headers"], org["id"], project["id"]


@pytest.mark.parametrize(
    "bad_url",
    [
        "http://hooks.slack.com/services/x",
        "https://localhost/hook",
        "http://169.254.169.254/latest/meta-data",
        "https://evil.com/webhook",
        "https://discord.com/not-a-webhook",
    ],
)
async def test_create_rejects_disallowed_urls(client: AsyncClient, bad_url: str) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": bad_url, "events": ["task.created"]},
        headers=headers,
    )
    assert response.status_code in (400, 422), response.text


async def test_create_detects_slack(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": SLACK_URL, "events": ["task.created"]},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["data"]["provider"] == "slack"


async def test_create_detects_discord(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": DISCORD_URL, "events": ["task.created"]},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["data"]["provider"] == "discord"


async def test_non_admin_member_is_forbidden(client: AsyncClient) -> None:
    owner = await register_and_login(client)
    org = await create_org(client, owner["headers"])
    project = await create_project(client, owner["headers"], org["id"], key="GATE")
    member = await register_and_login(client)
    await add_org_member(client, owner["headers"], org["id"], member, role="member")
    response = await client.get(_webhooks_base(org["id"], project["id"]), headers=member["headers"])
    assert response.status_code == 403, response.text


async def test_out_masks_url_and_omits_secret(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": SLACK_URL, "events": ["task.created"]},
        headers=headers,
    )
    data = response.json()["data"]
    assert data["url_hint"].startswith("hooks.slack.com/")
    assert "url" not in data
    assert "encrypted_url" not in data
    assert "nonce" not in data


async def test_stored_url_roundtrips_through_crypto(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    create = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": SLACK_URL, "events": ["task.created"]},
        headers=headers,
    )
    webhook_id = uuid.UUID(create.json()["data"]["id"])
    async with session_factory() as session:
        wh = await session.get(ProjectWebhook, webhook_id)
        assert wh is not None
        decrypted = decrypt_secret(
            wh.nonce, wh.encrypted_url, get_settings().kek_bytes, service._aad(wh.org_id)
        )
        assert decrypted == SLACK_URL


async def test_unknown_event_key_is_422(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": SLACK_URL, "events": ["task.not_a_real_event"]},
        headers=headers,
    )
    assert response.status_code == 422, response.text


async def test_crud_happy_path(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    base = _webhooks_base(org_id, project_id)

    create = await client.post(
        base,
        json={"url": SLACK_URL, "name": "Eng channel", "events": ["task.created"]},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    webhook_id = create.json()["data"]["id"]

    listed = await client.get(base, headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()["data"]) == 1

    fetched = await client.get(f"{base}/{webhook_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["data"]["name"] == "Eng channel"

    patched = await client.patch(
        f"{base}/{webhook_id}",
        json={"enabled": False, "events": ["task.created", "task.completed"]},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["enabled"] is False
    assert set(patched.json()["data"]["events"]) == {"task.created", "task.completed"}

    deleted = await client.delete(f"{base}/{webhook_id}", headers=headers)
    assert deleted.status_code == 200
    assert (await client.get(f"{base}/{webhook_id}", headers=headers)).status_code == 404


async def test_catalog_lists_groups(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.get(f"{_webhooks_base(org_id, project_id)}/catalog", headers=headers)
    assert response.status_code == 200, response.text
    groups = response.json()["data"]["groups"]
    domains = {group["domain"] for group in groups}
    assert "Tasks" in domains


class _RecordingSender:
    """Captures every (provider, url, payload) the dispatcher tries to send."""

    def __init__(self, *, ok: bool = True) -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self.secrets: list[str | None] = []
        self.ok = ok

    async def __call__(
        self,
        provider: str,
        url: str,
        payload: dict[str, Any],
        *,
        secret: str | None = None,
        event_type: str | None = None,
    ) -> tuple[bool, str]:
        self.calls.append((provider, url, payload))
        self.secrets.append(secret)
        return self.ok, "200 ok" if self.ok else "500"


async def _insert_webhook(
    org_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    events: list[str],
    enabled: bool = True,
    url: str = SLACK_URL,
) -> uuid.UUID:
    nonce, ciphertext = encrypt_secret(url, get_settings().kek_bytes, service._aad(org_id))
    async with session_factory() as session:
        wh = ProjectWebhook(
            org_id=org_id,
            project_id=project_id,
            provider="slack",
            name="hook",
            encrypted_url=ciphertext,
            nonce=nonce,
            url_hint="hooks.slack.com/…ZZZZ",
            enabled=enabled,
            events=events,
        )
        session.add(wh)
        await session.flush()
        wh_id = wh.id
        await session.commit()
    return wh_id


async def _create_task_returning_ids(
    client: AsyncClient, headers: dict[str, str], org_id: str, project_id: str
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    response = await client.post(
        f"{API}/orgs/{org_id}/projects/{project_id}/tasks",
        json={"title": "Dispatch task"},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    task = response.json()["data"]
    return uuid.UUID(org_id), uuid.UUID(project_id), uuid.UUID(task["id"])


def _task_created_event(
    org_id: uuid.UUID, project_id: uuid.UUID, task_id: uuid.UUID
) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "org_id": str(org_id),
        "project_id": str(project_id),
        "actor_id": None,
        "entity_type": "task",
        "entity_id": str(task_id),
        "event_type": "created",
    }


async def test_dispatch_delivers_to_matching_enabled_webhook(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id_s, project_id_s = await _setup(client)
    org_id, project_id, task_id = await _create_task_returning_ids(
        client, headers, org_id_s, project_id_s
    )
    await _insert_webhook(org_id, project_id, events=["task.created"])
    recorder = _RecordingSender()
    monkeypatch.setattr(sender, "send", recorder)

    await service.dispatch_event(_task_created_event(org_id, project_id, task_id))

    assert len(recorder.calls) == 1
    assert recorder.calls[0][0] == "slack"


async def test_dispatch_skips_disabled_webhook(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id_s, project_id_s = await _setup(client)
    org_id, project_id, task_id = await _create_task_returning_ids(
        client, headers, org_id_s, project_id_s
    )
    await _insert_webhook(org_id, project_id, events=["task.created"], enabled=False)
    recorder = _RecordingSender()
    monkeypatch.setattr(sender, "send", recorder)

    await service.dispatch_event(_task_created_event(org_id, project_id, task_id))

    assert recorder.calls == []


async def test_dispatch_skips_unsubscribed_webhook(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id_s, project_id_s = await _setup(client)
    org_id, project_id, task_id = await _create_task_returning_ids(
        client, headers, org_id_s, project_id_s
    )
    await _insert_webhook(org_id, project_id, events=["task.deleted"])
    recorder = _RecordingSender()
    monkeypatch.setattr(sender, "send", recorder)

    await service.dispatch_event(_task_created_event(org_id, project_id, task_id))

    assert recorder.calls == []


async def test_dispatch_swallows_sender_failure_and_still_delivers_others(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id_s, project_id_s = await _setup(client)
    org_id, project_id, task_id = await _create_task_returning_ids(
        client, headers, org_id_s, project_id_s
    )
    await _insert_webhook(org_id, project_id, events=["task.created"])
    await _insert_webhook(org_id, project_id, events=["task.created"])

    delivered: list[str] = []
    call_count = {"n": 0}

    async def flaky_send(
        provider: str,
        url: str,
        payload: dict[str, Any],
        *,
        secret: str | None = None,
        event_type: str | None = None,
    ) -> tuple[bool, str]:
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("boom")
        delivered.append(provider)
        return True, "200 ok"

    monkeypatch.setattr(sender, "send", flaky_send)

    await service.dispatch_event(_task_created_event(org_id, project_id, task_id))

    assert call_count["n"] == 2
    assert delivered == ["slack"]


async def test_dispatch_ignores_unmapped_event(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id_s, project_id_s = await _setup(client)
    org_id, project_id, task_id = await _create_task_returning_ids(
        client, headers, org_id_s, project_id_s
    )
    await _insert_webhook(org_id, project_id, events=["task.created"])
    recorder = _RecordingSender()
    monkeypatch.setattr(sender, "send", recorder)

    event = _task_created_event(org_id, project_id, task_id)
    event["event_type"] = "never_mapped"
    await service.dispatch_event(event)

    assert recorder.calls == []


def test_compute_signature_matches_hmac() -> None:
    secret = "s3cr3t"
    body = b'{"hello":"world"}'
    expected = hmac.new(secret.encode(), b"123." + body, hashlib.sha256).hexdigest()
    assert sender.compute_signature(secret, "123", body) == f"sha256={expected}"


async def test_create_returns_signing_secret(client: AsyncClient) -> None:
    headers, org_id, project_id = await _setup(client)
    response = await client.post(
        _webhooks_base(org_id, project_id),
        json={"url": SLACK_URL, "events": ["task.created"]},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    secret = response.json()["data"]["signing_secret"]
    assert len(secret) == 64
    listed = await client.get(_webhooks_base(org_id, project_id), headers=headers)
    assert "signing_secret" not in listed.json()["data"][0]


async def test_dispatch_passes_webhook_secret_to_sender(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, org_id_s, project_id_s = await _setup(client)
    org_id, project_id, task_id = await _create_task_returning_ids(
        client, headers, org_id_s, project_id_s
    )
    await _insert_webhook(org_id, project_id, events=["task.created"])
    recorder = _RecordingSender()
    monkeypatch.setattr(sender, "send", recorder)

    await service.dispatch_event(_task_created_event(org_id, project_id, task_id))

    assert len(recorder.secrets) == 1
    passed_secret = recorder.secrets[0]
    assert passed_secret is not None
    assert len(passed_secret) >= 32
