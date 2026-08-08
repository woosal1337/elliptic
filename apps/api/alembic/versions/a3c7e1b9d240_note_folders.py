"""Mark notes that act as folders.

Notes already nested through ``parent_id``; this only records which of them are
meant to be walked into. One hierarchy rather than a second one alongside it, so
nothing existing has to move.

Revision ID: a3c7e1b9d240
Revises: e1f4a72c9d38
"""

import sqlalchemy as sa
from alembic import op

revision = "a3c7e1b9d240"
down_revision = "e1f4a72c9d38"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Additive with a server default, so the running old code keeps inserting
    # valid rows while the new image rolls out (expand/contract).
    op.add_column(
        "notes",
        sa.Column("is_folder", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Every folder listing filters on it alongside the parent.
    op.create_index("ix_notes_parent_folder", "notes", ["parent_id", "is_folder"])


def downgrade() -> None:
    op.drop_index("ix_notes_parent_folder", table_name="notes")
    op.drop_column("notes", "is_folder")
