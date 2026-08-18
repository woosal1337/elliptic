"""Organization, membership, and invitation models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    false,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class OrgRole(enum.StrEnum):
    """Organization-level role hierarchy."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"


ROLE_ORDER: dict[OrgRole, int] = {
    OrgRole.GUEST: 0,
    OrgRole.MEMBER: 1,
    OrgRole.ADMIN: 2,
    OrgRole.OWNER: 3,
}


class InviteStatus(enum.StrEnum):
    """Lifecycle status of an organization invitation."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"
    EXPIRED = "expired"


class Organization(BaseModel):
    """A tenant organization."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    block_backward_transitions: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false()
    )
    plan: Mapped[str] = mapped_column(String(20), default="free", server_default="free")
    residency_region: Mapped[str | None] = mapped_column(String(20), nullable=True)
    compliance_frameworks: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    data_controller: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dpo_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)


class OrganizationMember(BaseModel):
    """Membership of a user in an organization with a role."""

    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("org_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[OrgRole] = mapped_column(Enum(OrgRole, native_enum=False, length=20))
    custom_role_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("custom_roles.id", ondelete="SET NULL"), nullable=True
    )


class CustomRole(BaseModel):
    """An org-defined role with a granular permission set (COS-176)."""

    __tablename__ = "custom_roles"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    permissions: Mapped[list[str]] = mapped_column(JSONB, default=list)
    matrix: Mapped[dict[str, dict[str, str]]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )


class Invitation(BaseModel):
    """A pending or settled invitation to join an organization."""

    __tablename__ = "invitations"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[OrgRole] = mapped_column(Enum(OrgRole, native_enum=False, length=20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[InviteStatus] = mapped_column(
        Enum(InviteStatus, native_enum=False, length=20), default=InviteStatus.PENDING
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    invited_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    accepted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
