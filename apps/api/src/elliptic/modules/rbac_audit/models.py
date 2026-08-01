"""Dedicated RBAC audit trail — a compliance log of permission/role mutations.

Distinct from the generic activity stream: every row carries the role before AND
after on the relevant axis, so admins can answer "who changed whose access, from
what to what, and when".
"""

import enum
import uuid
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class RbacResourceScope(enum.StrEnum):
    """Which scope the mutated grant belongs to."""

    ORG = "org"
    PROJECT = "project"
    TEAM = "team"


class RbacAction(enum.StrEnum):
    """The kind of RBAC mutation recorded."""

    MEMBER_INVITED = "member_invited"
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    ORG_ROLE_CHANGED = "org_role_changed"
    PROJECT_ROLE_CHANGED = "project_role_changed"
    TEAM_MEMBER_ADDED = "team_member_added"
    TEAM_MEMBER_REMOVED = "team_member_removed"


class RbacAuditEvent(BaseModel):
    """One immutable record of a role/permission change."""

    __tablename__ = "rbac_audit_events"
    __table_args__ = (
        Index("ix_rbac_audit_org_created", "org_id", "created_at"),
        Index("ix_rbac_audit_org_subject", "org_id", "subject_user_id"),
        Index("ix_rbac_audit_org_actor", "org_id", "actor_id"),
        Index("ix_rbac_audit_org_resource", "org_id", "resource_scope", "resource_id"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_type: Mapped[str] = mapped_column(String(20), default="user", server_default="user")
    subject_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resource_scope: Mapped[RbacResourceScope] = mapped_column(
        Enum(RbacResourceScope, native_enum=False, length=20)
    )
    resource_id: Mapped[uuid.UUID] = mapped_column()
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[RbacAction] = mapped_column(Enum(RbacAction, native_enum=False, length=30))
    role_before: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role_after: Mapped[str | None] = mapped_column(String(20), nullable=True)
    detail: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
