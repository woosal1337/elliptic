"""In-process activity broker and a Postgres LISTEN bridge for live sync."""

import asyncio
import contextlib
import json
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import asyncpg
from loguru import logger

from elliptic.core.config import get_settings

CHANNEL = "companyos_activity"
_QUEUE_MAXSIZE = 100

_event_handlers: list[Callable[[dict[str, Any]], Awaitable[None]]] = []
_background_tasks: set[asyncio.Task[None]] = set()


def register_event_handler(handler: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
    """Register an async handler invoked (best-effort) for every notified event."""
    _event_handlers.append(handler)


async def _run_handler(
    handler: Callable[[dict[str, Any]], Awaitable[None]], event: dict[str, Any]
) -> None:
    """Run one event handler, swallowing and logging any failure so it never raises."""
    try:
        await handler(event)
    except Exception:
        logger.exception("Event handler {} failed", getattr(handler, "__name__", handler))


class ActivityBroker:
    """Fan activity events out to per-organization subscriber queues in this process."""

    def __init__(self) -> None:
        self._subscribers: dict[uuid.UUID, set[asyncio.Queue[dict[str, Any]]]] = {}

    def subscribe(self, org_id: uuid.UUID) -> asyncio.Queue[dict[str, Any]]:
        """Register and return a new bounded subscriber queue for an organization."""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=_QUEUE_MAXSIZE)
        self._subscribers.setdefault(org_id, set()).add(queue)
        return queue

    def unsubscribe(self, org_id: uuid.UUID, queue: asyncio.Queue[dict[str, Any]]) -> None:
        """Remove a subscriber queue, dropping the organization bucket when it empties."""
        subscribers = self._subscribers.get(org_id)
        if subscribers is None:
            return
        subscribers.discard(queue)
        if not subscribers:
            self._subscribers.pop(org_id, None)

    def publish(self, org_id: uuid.UUID, event: dict[str, Any]) -> None:
        """Deliver an event to an organization's subscribers, dropping the oldest when full."""
        for queue in list(self._subscribers.get(org_id, set())):
            if queue.full():
                self._drop_oldest(queue)
            with contextlib.suppress(asyncio.QueueFull):
                queue.put_nowait(event)

    @staticmethod
    def _drop_oldest(queue: asyncio.Queue[dict[str, Any]]) -> None:
        with contextlib.suppress(asyncio.QueueEmpty):
            queue.get_nowait()


broker = ActivityBroker()


def _asyncpg_dsn() -> str:
    return get_settings().database_url.replace("+asyncpg", "")


class ActivityListener:
    """Bridge Postgres NOTIFY on the activity channel into the in-process broker."""

    def __init__(self) -> None:
        self._connection: Any = None

    async def start(self) -> None:
        """Open a dedicated LISTEN connection outside the SQLAlchemy pool."""
        self._connection = await asyncpg.connect(_asyncpg_dsn())
        await self._connection.add_listener(CHANNEL, self._on_notify)
        logger.info("Activity listener started on channel {}", CHANNEL)

    async def stop(self) -> None:
        """Close the LISTEN connection."""
        if self._connection is None:
            return
        await self._connection.remove_listener(CHANNEL, self._on_notify)
        await self._connection.close()
        self._connection = None

    def _on_notify(self, _connection: object, _pid: int, _channel: str, payload: str) -> None:
        try:
            event: dict[str, Any] = json.loads(payload)
            org_id = uuid.UUID(str(event["org_id"]))
        except (ValueError, KeyError, TypeError):
            return
        broker.publish(org_id, event)
        for handler in _event_handlers:
            task = asyncio.create_task(_run_handler(handler, event))
            _background_tasks.add(task)
            task.add_done_callback(_background_tasks.discard)


listener = ActivityListener()
