"""OIDC single sign-on connections (COS-170)."""

import uuid

from sqlalchemy import Boolean, ForeignKey, LargeBinary, String, false, true
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class SSOConnection(BaseModel):
    """A per-org OIDC identity-provider connection, domain-gated (COS-170).

    The client secret is encrypted at rest with the same AES-256-GCM custody as
    BYOK provider keys. SAML is a deferred follow-up; this ships OIDC.
    """

    __tablename__ = "sso_connections"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    domain: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    issuer: Mapped[str] = mapped_column(String(500))
    client_id: Mapped[str] = mapped_column(String(500))
    encrypted_secret: Mapped[bytes] = mapped_column(LargeBinary)
    nonce: Mapped[bytes] = mapped_column(LargeBinary)
    redirect_uri: Mapped[str] = mapped_column(String(1000))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=false())
    group_attribute_key: Mapped[str] = mapped_column(
        String(100), default="groups", server_default="groups"
    )
    sync_on_login: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    auto_remove: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
