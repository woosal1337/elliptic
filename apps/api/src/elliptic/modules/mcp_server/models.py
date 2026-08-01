"""Persistence for the embedded MCP server (idempotency)."""

import uuid
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class McpIdempotencyKey(BaseModel):
    """A processed create/import intent, keyed per org so retries are no-ops."""

    __tablename__ = "mcp_idempotency_keys"
    __table_args__ = (UniqueConstraint("org_id", "key"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(255))
    tool: Mapped[str] = mapped_column(String(100))
    result: Mapped[dict[str, Any]] = mapped_column(JSONB)
