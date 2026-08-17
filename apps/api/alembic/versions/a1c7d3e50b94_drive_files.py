"""drive_files (the organization Drive)

Revision ID: a1c7d3e50b94
Revises: d5b8e0c31f27
Create Date: 2026-08-17 13:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1c7d3e50b94"
down_revision: str | None = "d5b8e0c31f27"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "drive_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("org_id", sa.Uuid(), nullable=False),
        sa.Column("stored_object_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column(
            "folder_path",
            sa.String(length=1024),
            server_default=sa.text("''"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("uploaded_by", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["org_id"],
            ["organizations.id"],
            name=op.f("fk_drive_files_org_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stored_object_id"],
            ["stored_objects.id"],
            name=op.f("fk_drive_files_stored_object_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by"],
            ["users.id"],
            name=op.f("fk_drive_files_uploaded_by"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_drive_files")),
    )
    op.create_index("ix_drive_files_org_id", "drive_files", ["org_id"])
    op.create_index(
        "ix_drive_files_stored_object_id", "drive_files", ["stored_object_id"], unique=True
    )
    op.create_index("ix_drive_files_org_folder", "drive_files", ["org_id", "folder_path"])


def downgrade() -> None:
    op.drop_index("ix_drive_files_org_folder", table_name="drive_files")
    op.drop_index("ix_drive_files_stored_object_id", table_name="drive_files")
    op.drop_index("ix_drive_files_org_id", table_name="drive_files")
    op.drop_table("drive_files")
