"""Per-org outbound MCP connectors (COS-228)."""

import uuid

from sqlalchemy import Boolean, ForeignKey, LargeBinary, String, false
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class McpConnector(BaseModel):
    """An org's connection to a remote MCP server. Credential encrypted (COS-228)."""

    __tablename__ = "mcp_connectors"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    catalog_key: Mapped[str] = mapped_column(String(50))
    display_name: Mapped[str] = mapped_column(String(200))
    transport: Mapped[str] = mapped_column(String(10), default="http")
    endpoint_url: Mapped[str] = mapped_column(String(1000))
    auth_type: Mapped[str] = mapped_column(String(20), default="bearer")
    header_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    encrypted_credential: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    nonce: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=false())
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
