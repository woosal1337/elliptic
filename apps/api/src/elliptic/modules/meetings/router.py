"""Meeting endpoints including Folio import, summarize, and chat."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.meetings import service
from elliptic.modules.meetings.schemas import (
    FolioImportIn,
    MeetingCreateIn,
    MeetingOut,
    MeetingShareOut,
    MeetingUpdateIn,
    SegmentOut,
    ShareCreateIn,
    ShareUpdateIn,
    TranscriptChapterOut,
)

router = APIRouter(prefix="/orgs/{org_id}/meetings", tags=["meetings"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: MeetingCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingOut]:
    meeting = await service.create_meeting(session, ctx, payload)
    return ok(MeetingOut.model_validate(meeting), message="Meeting created")


@router.get("")
async def list_meetings(
    ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[MeetingOut]]:
    meetings, total = await service.list_meetings(session, ctx, page)
    items = [MeetingOut.model_validate(meeting) for meeting in meetings]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_folio(
    payload: FolioImportIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingOut]:
    meeting = await service.import_folio(session, ctx, payload)
    return ok(MeetingOut.model_validate(meeting), message="Meeting imported")


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingOut]:
    meeting = await service.get_meeting(session, ctx, meeting_id)
    return ok(MeetingOut.model_validate(meeting))


@router.patch("/{meeting_id}")
async def update_meeting(
    meeting_id: uuid.UUID, payload: MeetingUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingOut]:
    meeting = await service.update_meeting(session, ctx, meeting_id, payload)
    return ok(MeetingOut.model_validate(meeting), message="Meeting updated")


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_meeting(session, ctx, meeting_id)
    return ok(None, message="Meeting deleted")


@router.get("/{meeting_id}/segments")
async def list_segments(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[SegmentOut]]:
    segments, total = await service.list_segments(session, ctx, meeting_id, page)
    items = [SegmentOut.model_validate(segment) for segment in segments]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.get("/{meeting_id}/chapters")
async def list_chapters(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[TranscriptChapterOut]]:
    chapters = await service.list_chapters(session, ctx, meeting_id)
    return ok(chapters)


@router.get("/{meeting_id}/share")
async def get_share(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingShareOut | None]:
    share = await service.get_meeting_share(session, ctx, meeting_id)
    return ok(MeetingShareOut.model_validate(share) if share is not None else None)


@router.post("/{meeting_id}/share", status_code=status.HTTP_201_CREATED)
async def create_share(
    meeting_id: uuid.UUID, payload: ShareCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingShareOut]:
    share = await service.create_meeting_share(session, ctx, meeting_id, payload)
    return ok(MeetingShareOut.model_validate(share), message="Share link created")


@router.patch("/{meeting_id}/share")
async def update_share(
    meeting_id: uuid.UUID, payload: ShareUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingShareOut]:
    share = await service.update_meeting_share(session, ctx, meeting_id, payload)
    return ok(MeetingShareOut.model_validate(share), message="Share updated")
