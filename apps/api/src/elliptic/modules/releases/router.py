"""Release endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.releases import service
from elliptic.modules.releases.models import Release
from elliptic.modules.releases.schemas import (
    ChangelogEntryIn,
    ChangelogEntryOut,
    ChangelogEntryUpdateIn,
    ReleaseCreateIn,
    ReleaseOut,
    ReleaseUpdateIn,
)
from elliptic.modules.tasks import service as tasks_service
from elliptic.modules.tasks.schemas import TaskOut

router = APIRouter(prefix="/orgs/{org_id}/releases", tags=["releases"])


def _to_out(release: Release, counts: dict[uuid.UUID, dict[str, int]]) -> ReleaseOut:
    out = ReleaseOut.model_validate(release)
    breakdown = counts.get(release.id, {})
    out.task_total = breakdown.get("total", 0)
    out.task_done = breakdown.get("done", 0)
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_release(
    payload: ReleaseCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ReleaseOut]:
    release = await service.create_release(session, ctx, payload)
    return ok(ReleaseOut.model_validate(release), message="Release created")


@router.get("/{release_id}/changelog")
async def list_changelog(
    release_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ChangelogEntryOut]]:
    entries = await service.list_changelog(session, ctx, release_id)
    return ok([ChangelogEntryOut.model_validate(entry) for entry in entries])


@router.post("/{release_id}/changelog", status_code=status.HTTP_201_CREATED)
async def create_changelog_entry(
    release_id: uuid.UUID, payload: ChangelogEntryIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ChangelogEntryOut]:
    entry = await service.create_changelog_entry(
        session,
        ctx,
        release_id,
        category=payload.category,
        title=payload.title,
        body=payload.body,
        pr_url=payload.pr_url,
    )
    return ok(ChangelogEntryOut.model_validate(entry), message="Entry added")


@router.patch("/changelog/{entry_id}")
async def update_changelog_entry(
    entry_id: uuid.UUID, payload: ChangelogEntryUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ChangelogEntryOut]:
    entry = await service.update_changelog_entry(
        session,
        ctx,
        entry_id,
        category=payload.category,
        title=payload.title,
        body=payload.body,
        pr_url=payload.pr_url,
    )
    return ok(ChangelogEntryOut.model_validate(entry), message="Entry updated")


@router.delete("/changelog/{entry_id}")
async def delete_changelog_entry(
    entry_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_changelog_entry(session, ctx, entry_id)
    return ok(None, message="Entry deleted")


@router.get("")
async def list_releases(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[ReleaseOut]]:
    releases = await service.list_releases(session, ctx)
    counts = await service.release_counts(session, [r.id for r in releases])
    return ok([_to_out(r, counts) for r in releases])


@router.get("/{release_id}")
async def get_release(
    release_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ReleaseOut]:
    release = await service.get_release(session, ctx, release_id)
    counts = await service.release_counts(session, [release.id])
    return ok(_to_out(release, counts))


@router.patch("/{release_id}")
async def update_release(
    release_id: uuid.UUID, payload: ReleaseUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ReleaseOut]:
    release = await service.update_release(session, ctx, release_id, payload)
    counts = await service.release_counts(session, [release.id])
    return ok(_to_out(release, counts), message="Release updated")


@router.delete("/{release_id}")
async def delete_release(
    release_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_release(session, ctx, release_id)
    return ok(None, message="Release deleted")


@router.get("/{release_id}/tasks")
async def list_release_tasks(
    release_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TaskOut]]:
    tasks_with_keys = await service.list_release_tasks(session, ctx, release_id)
    return ok(await tasks_service.serialize_mixed_tasks(session, tasks_with_keys))


@router.post("/{release_id}/tasks/{task_id}", status_code=status.HTTP_201_CREATED)
async def assign_task(
    release_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.assign_task(session, ctx, release_id, task_id)
    return ok(None, message="Task tagged into release")


@router.delete("/{release_id}/tasks/{task_id}")
async def unassign_task(
    release_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unassign_task(session, ctx, release_id, task_id)
    return ok(None, message="Task removed from release")
