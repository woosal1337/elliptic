"""Realtime co-editing: a Yjs websocket relay over FastAPI (COS-89).

In-memory relay only — durable content stays in the note's markdown (the editor keeps
autosaving). The first client to open a note seeds the shared Y.doc from that markdown.
"""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from pycrdt.websocket import WebsocketServer
from sqlalchemy import select
from starlette.websockets import WebSocket, WebSocketDisconnect

from elliptic.modules.notes.models import Note
from elliptic.modules.orgs.models import OrganizationMember

_server: WebsocketServer | None = None


@asynccontextmanager
async def run_server() -> AsyncIterator[None]:
    """Start the shared Yjs relay for the app lifespan."""
    global _server  # noqa: PLW0603
    server = WebsocketServer(auto_clean_rooms=True)
    async with server:
        _server = server
        try:
            yield
        finally:
            _server = None


def server() -> WebsocketServer:
    if _server is None:
        raise RuntimeError("Realtime co-editing server is not running")
    return _server


class WSChannel:
    """Adapt a Starlette WebSocket to pycrdt's Channel protocol (room = note id)."""

    def __init__(self, websocket: WebSocket, path: str) -> None:
        self._ws = websocket
        self.path = path

    async def send(self, message: bytes) -> None:
        await self._ws.send_bytes(message)

    async def recv(self) -> bytes:
        return await self._ws.receive_bytes()

    def __aiter__(self) -> "WSChannel":
        return self

    async def __anext__(self) -> bytes:
        try:
            return await self._ws.receive_bytes()
        except WebSocketDisconnect as exc:  # noqa: F841
            raise StopAsyncIteration from None


async def note_accessible(session: object, user_id: uuid.UUID, note_id: uuid.UUID) -> bool:
    """True if the user is a member of the note's organization."""
    from sqlalchemy.ext.asyncio import AsyncSession  # noqa: PLC0415

    assert isinstance(session, AsyncSession)  # noqa: S101
    row = await session.scalar(
        select(Note.id)
        .join(OrganizationMember, OrganizationMember.org_id == Note.org_id)
        .where(Note.id == note_id, OrganizationMember.user_id == user_id)
    )
    return row is not None
