"""Liveness / readiness probes for orchestrators (COS-259)."""

import time

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from elliptic.core.config import get_settings
from elliptic.core.database import engine
from elliptic.core.schemas import SuccessResponse, ok

router = APIRouter(tags=["health"])

_READY_TTL = 5.0
_ready_cache: dict[str, object] = {"ts": 0.0, "ready": False, "error": None}


@router.get("/livez")
async def livez() -> SuccessResponse[dict[str, str]]:
    """Liveness: the process is up and serving. Never touches dependencies (COS-259)."""
    return ok({"status": "alive"})


async def _check_db() -> tuple[bool, str | None]:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:
        return False, str(exc)[:200]


@router.get("/readyz")
async def readyz(response: Response) -> SuccessResponse[dict[str, object]]:
    """Readiness: dependencies reachable. The DB check is cached for ~5s (COS-259)."""
    now = time.monotonic()
    ts = _ready_cache["ts"]
    if not isinstance(ts, float) or now - ts > _READY_TTL:
        ready, error = await _check_db()
        _ready_cache.update({"ts": now, "ready": ready, "error": error})
    if not _ready_cache["ready"]:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ok(
        {
            "status": "ready" if _ready_cache["ready"] else "unready",
            "database": _ready_cache["ready"],
            "error": _ready_cache["error"],
            "env": get_settings().env,
        }
    )
