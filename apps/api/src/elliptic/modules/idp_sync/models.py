"""IdP group -> project-role mappings (COS-181)."""

import uuid

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel
from elliptic.modules.projects.models import ProjectRole


class GroupRoleMapping(BaseModel):
    """Maps an IdP group name to a project role grant (COS-181)."""

    __tablename__ = "group_role_mappings"
    __table_args__ = (UniqueConstraint("org_id", "idp_group", "project_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    idp_group: Mapped[str] = mapped_column(String(255))
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole, native_enum=False, length=20), default=ProjectRole.MEMBER
    )
