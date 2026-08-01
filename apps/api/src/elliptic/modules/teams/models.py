"""Team (teamspace) and team membership models."""

import uuid

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel
from elliptic.modules.projects.models import ProjectRole


class Team(BaseModel):
    """A teamspace within an organization: people + a charter + linked projects."""

    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    logo_props: Mapped[dict[str, str]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    charter: Mapped[str | None] = mapped_column(Text, nullable=True)


class TeamMember(BaseModel):
    """Membership of an org member in a team."""

    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class TeamProjectLink(BaseModel):
    """A teamspace's link to a project, carrying the role granted to team members.

    This is the MANY-projects relation for a teamspace, distinct from the OWNING
    ``Project.team_id`` FK used by team-stats roll-ups.
    """

    __tablename__ = "team_project_links"
    __table_args__ = (UniqueConstraint("team_id", "project_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole, native_enum=False, length=20),
        default=ProjectRole.MEMBER,
        server_default=ProjectRole.MEMBER.name,
    )
