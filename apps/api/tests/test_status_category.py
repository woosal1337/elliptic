"""Fixed 5-category status model: derivation, exposure, and progress math (BT-01)."""

from httpx import AsyncClient

from elliptic.modules.tasks.models import (
    PROGRESS_EXCLUDED_STATUSES,
    STATUS_TO_CATEGORY,
    StatusCategory,
    TaskStatus,
    status_category,
)
from tests.helpers import API, create_org, create_project, create_task, register_and_login


def test_every_status_maps_to_a_category() -> None:
    for status in TaskStatus:
        assert status in STATUS_TO_CATEGORY
        assert isinstance(STATUS_TO_CATEGORY[status], StatusCategory)


def test_category_derivation_is_stable() -> None:
    assert status_category(TaskStatus.BACKLOG) is StatusCategory.BACKLOG
    assert status_category(TaskStatus.TODO) is StatusCategory.UNSTARTED
    assert status_category(TaskStatus.IN_PROGRESS) is StatusCategory.STARTED
    assert status_category(TaskStatus.IN_REVIEW) is StatusCategory.STARTED
    assert status_category(TaskStatus.DONE) is StatusCategory.COMPLETED
    assert status_category(TaskStatus.CANCELLED) is StatusCategory.CANCELLED
    assert status_category(TaskStatus.DUPLICATE) is StatusCategory.CANCELLED


def test_progress_excluded_statuses_are_the_cancelled_band() -> None:
    assert frozenset({TaskStatus.CANCELLED, TaskStatus.DUPLICATE}) == PROGRESS_EXCLUDED_STATUSES


async def test_task_out_exposes_category(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    org = await create_org(client, auth["headers"])
    project = await create_project(client, auth["headers"], org["id"], key="CAT")
    task = await create_task(client, auth["headers"], org["id"], project["id"])
    assert task["status"] == "backlog"
    assert task["category"] == "backlog"


async def test_subtask_progress_excludes_cancelled_and_duplicate(client: AsyncClient) -> None:
    auth = await register_and_login(client)
    headers = auth["headers"]
    org = await create_org(client, headers)
    project = await create_project(client, headers, org["id"], key="PROG")
    parent = await create_task(client, headers, org["id"], project["id"], title="Parent")
    children = []
    for index in range(4):
        child = await create_task(
            client,
            headers,
            org["id"],
            project["id"],
            title=f"Child {index}",
            parent_task_id=parent["id"],
        )
        children.append(child)

    async def set_status(task_id: str, status: str) -> None:
        response = await client.post(
            f"{API}/orgs/{org['id']}/tasks/{task_id}/status",
            json={"status": status},
            headers=headers,
        )
        assert response.status_code == 200, response.text

    await set_status(children[0]["id"], "done")
    await set_status(children[1]["id"], "cancelled")
    await set_status(children[2]["id"], "duplicate")

    response = await client.get(f"{API}/orgs/{org['id']}/tasks/{parent['id']}", headers=headers)
    body = response.json()["data"]
    assert body["subtask_total"] == 2
    assert body["subtask_done"] == 1
