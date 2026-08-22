"""Markdown note (page) models."""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class Note(BaseModel):
    """A markdown note within an organization, optionally tied to a project.

    Every org member sees every note — the workspace is the boundary, so a
    note carries no visibility tier of its own.
    """

    __tablename__ = "notes"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(16), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # A folder is a note that is meant to hold others, not a separate kind of
    # row. Notes already nested through parent_id, so this flag only says which
    # of them the UI should let you walk into — one hierarchy rather than a
    # second one alongside it. Folders keep their content field: a line about
    # what belongs here is worth having when an agent is choosing where to file.
    is_folder: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    updated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
