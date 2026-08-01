"""Realtime co-editing endpoints (COS-89)."""

import contextlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Query, WebSocket
from starlette.websockets import WebSocketDisconnect

from elliptic.core.database import session_factory
from elliptic.core.deps import CurrentUser
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.core.security import create_access_token, decode_token
from elliptic.modules.coediting import service

router = APIRouter(tags=["coediting"])


@router.get("/realtime/token")
async def realtime_token(user: CurrentUser) -> SuccessResponse[dict[str, object]]:
    """Mint a short-lived token for the browser to open the co-editing websocket.

    The web app authenticates with httponly SameSite cookies that the browser will not
    send on a cross-origin websocket, so it fetches this token and passes it in the URL.
    """
    return ok({"token": create_access_token(user.id), "expires_in_minutes": 30})


@router.websocket("/ws/notes/{note_id}")
async def note_coediting(
    websocket: WebSocket,
    note_id: uuid.UUID,
    token: Annotated[str, Query()],
) -> None:
    """Relay Yjs sync + awareness for a note's collaborative editing session (COS-89)."""
    try:
        user_id = decode_token(token, "access")
    except Exception:
        await websocket.close(code=4401)
        return
    async with session_factory() as session:
        if not await service.note_accessible(session, user_id, note_id):
            await websocket.close(code=4403)
            return

    await websocket.accept()
    channel = service.WSChannel(websocket, str(note_id))
    with contextlib.suppress(WebSocketDisconnect):
        await service.server().serve(channel)
