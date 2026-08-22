"""Async engine, session factory, and request-scoped session dependency."""

from collections.abc import AsyncIterator
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from elliptic.core.config import get_settings

engine = create_async_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=15,
)

session_factory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)

_SCOPE_KEY = "elliptic_db_session"
_FIRST_ERROR_STATUS = 400


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Yield a request-scoped session, committing on success and rolling back on error.

    The commit after the yield is a backstop. Starlette runs dependency
    teardown after the response has already reached the client, so a client
    that sends its next request the moment this one answers can read before
    that commit lands. Browsers never race it. Agents do — a register that
    answers 201 followed by a login that finds no user. CommitBeforeResponse
    commits at response start, before the client can act on the answer, and
    the commit here then closes an empty transaction.
    """
    async with session_factory() as session:
        request.scope[_SCOPE_KEY] = session
        try:
            yield session
            await session.commit()
        except BaseException:
            await session.rollback()
            raise
        finally:
            request.scope.pop(_SCOPE_KEY, None)


class CommitBeforeResponse:
    """Commit the request's session before the first response byte leaves.

    Error responses are skipped: FastAPI turns a raised HTTPException into a
    4xx/5xx after the dependency's rollback path decides, so the teardown in
    get_session stays the only authority for failures.
    """

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_committed(message: Any) -> None:
            if message["type"] == "http.response.start" and message["status"] < _FIRST_ERROR_STATUS:
                session = scope.get(_SCOPE_KEY)
                if session is not None:
                    await session.commit()
            await send(message)

        await self.app(scope, receive, send_committed)
