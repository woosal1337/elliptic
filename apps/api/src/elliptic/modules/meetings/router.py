"""Meeting endpoints including Folio import, summarize, and chat."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.ai import insight
from elliptic.modules.ai.schemas import RouteSuggestionOut
from elliptic.modules.meetings import service
from elliptic.modules.meetings.schemas import (
    FolioImportIn,
    MeetingChatIn,
    MeetingChatOut,
    MeetingCreateIn,
    MeetingOut,
    MeetingShareOut,
    MeetingUpdateIn,
    OrgMeetingChatIn,
    OrgMeetingChatOut,
    RecipeRunIn,
    SegmentOut,
    ShareCreateIn,
    ShareUpdateIn,
    SummarizeIn,
    SummaryOut,
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


@router.post("/chat")
async def chat_across_meetings(
    payload: OrgMeetingChatIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[OrgMeetingChatOut]:
    reply, model, run_id, citations, coverage = await service.chat_across_org_meetings(
        session, ctx, payload
    )
    return ok(
        OrgMeetingChatOut(
            reply=reply,
            model=model,
            ai_run_id=run_id,
            citations=citations,
            coverage=coverage,
        )
    )


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingOut]:
    meeting = await service.get_meeting(session, ctx, meeting_id)
    return ok(MeetingOut.model_validate(meeting))


@router.get("/{meeting_id}/suggest-project")
async def suggest_meeting_project(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RouteSuggestionOut]:
    await service.get_meeting(session, ctx, meeting_id)
    suggestion = await insight.suggest_route(session, ctx, "meeting", meeting_id)
    return ok(suggestion)


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


@router.get("/{meeting_id}/summaries")
async def list_summaries(
    meeting_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[SummaryOut]]:
    summaries = await service.list_summaries(session, ctx, meeting_id)
    return ok([SummaryOut.model_validate(summary) for summary in summaries])


@router.post("/{meeting_id}/summarize", status_code=status.HTTP_201_CREATED)
async def summarize_meeting(
    meeting_id: uuid.UUID, payload: SummarizeIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[SummaryOut]:
    summary = await service.summarize_meeting(session, ctx, meeting_id, payload)
    return ok(SummaryOut.model_validate(summary), message="Meeting summarized")


@router.post("/{meeting_id}/chat")
async def chat_about_meeting(
    meeting_id: uuid.UUID, payload: MeetingChatIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingChatOut]:
    reply, model, run_id = await service.chat_about_meeting(session, ctx, meeting_id, payload)
    return ok(MeetingChatOut(reply=reply, model=model, ai_run_id=run_id))


@router.post("/{meeting_id}/recipes/run")
async def run_recipe(
    meeting_id: uuid.UUID, payload: RecipeRunIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[MeetingChatOut]:
    reply, model, run_id = await service.run_recipe(session, ctx, meeting_id, payload)
    return ok(MeetingChatOut(reply=reply, model=model, ai_run_id=run_id))


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
