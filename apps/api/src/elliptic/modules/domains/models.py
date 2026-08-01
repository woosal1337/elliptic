"""Email-domain verification for SSO (COS-193)."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class DomainStatus(enum.StrEnum):
    PENDING = "pending"
    VERIFIED = "verified"


class OrgDomain(BaseModel):
    """An org-claimed email domain, verified via a DNS TXT challenge (COS-193).

    A verified domain is globally unique (one workspace per domain), enforced by
    a partial unique index on (domain) where status = 'verified'.
    """

    __tablename__ = "org_domains"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    domain: Mapped[str] = mapped_column(String(255), index=True)
    txt_token: Mapped[str] = mapped_column(String(64))
    status: Mapped[DomainStatus] = mapped_column(
        Enum(DomainStatus, native_enum=False, length=20),
        default=DomainStatus.PENDING,
        server_default=DomainStatus.PENDING.name,
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
