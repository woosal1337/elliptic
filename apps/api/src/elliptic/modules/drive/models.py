"""Drive file model — one uploaded document in an org's Drive (COS-409).

The bytes stay in ``stored_objects`` (R2). This row is the *document*: the thing
that has a name, sits in a folder, and gets referenced from a task description.
One stored object backs exactly one drive file, so deleting either removes both.
"""

import uuid

from sqlalchemy import ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class DriveFile(BaseModel):
    """A document in an organization's Drive."""

    __tablename__ = "drive_files"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    stored_object_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stored_objects.id", ondelete="CASCADE"), unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(500))
    # A path, not a folder tree: "contracts/2026" with "" for the root. Listing
    # groups by prefix, so a folder needs no row of its own and cannot be
    # orphaned, and a rename is one prefix UPDATE.
    folder_path: Mapped[str] = mapped_column(String(1024), default="", server_default=text("''"))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (Index("ix_drive_files_org_folder", "org_id", "folder_path"),)
