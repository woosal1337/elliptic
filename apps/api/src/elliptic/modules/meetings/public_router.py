"""Unauthenticated public meeting-share endpoints (SAFE-01)."""

from fastapi import APIRouter

from elliptic.core.deps import SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.meetings import service
from elliptic.modules.meetings.schemas import PublicMeetingShareOut

router = APIRouter(prefix="/share/meetings", tags=["public-share"])


@router.get("/{token}")
async def get_public_share(
    token: str, session: SessionDep
) -> SuccessResponse[PublicMeetingShareOut]:
    """The guest view of a shared meeting: its title and, when the share allows
    it, the transcript."""
    return ok(await service.get_public_share(session, token))
