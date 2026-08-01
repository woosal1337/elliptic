"""Per-org LDAP / Active Directory connection (COS-173)."""

import uuid

from sqlalchemy import Boolean, ForeignKey, LargeBinary, String, false, true
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class LDAPConnection(BaseModel):
    """An org's LDAP/AD directory binding. The bind password is encrypted (COS-173)."""

    __tablename__ = "ldap_connections"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, unique=True
    )
    server_uri: Mapped[str] = mapped_column(String(500))
    use_tls: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    bind_dn: Mapped[str] = mapped_column(String(500))
    encrypted_bind_pw: Mapped[bytes] = mapped_column(LargeBinary)
    nonce: Mapped[bytes] = mapped_column(LargeBinary)
    search_base: Mapped[str] = mapped_column(String(500))
    search_filter: Mapped[str] = mapped_column(String(500), default="(sAMAccountName={username})")
    attr_email: Mapped[str] = mapped_column(String(100), default="mail")
    attr_first: Mapped[str] = mapped_column(String(100), default="givenName")
    attr_last: Mapped[str] = mapped_column(String(100), default="sn")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=false())
