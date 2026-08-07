"""drop stickies

The stickies feature was removed from every surface in 0cbaa58 — API module and
router, web page, dock, convert menu, hooks, dashboard widget, sidebar entry, and
the mobile screen with its route and API methods. The table was deliberately left
behind at the time: nothing pointed at it, so it was inert, and dropping it is the
one step that cannot be undone.

Dropping it now at the owner's direction. Checked first rather than assumed —
production `stickies` holds zero rows, so no data is lost.

Downgrade recreates the table exactly as d5e6f8a9b0c1 built it. It cannot restore
rows, but there were none.

Revision ID: e1f4a72c9d38
Revises: c8e2b40d5f19
Create Date: 2026-08-08 02:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e1f4a72c9d38"
down_revision: str | None = "c8e2b40d5f19"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_stickies_user_id"), table_name="stickies")
    op.drop_index(op.f("ix_stickies_org_id"), table_name="stickies")
    op.drop_table("stickies")


def downgrade() -> None:
    op.create_table(
        "stickies",
        sa.Column("org_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("position", sa.Float(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
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
            name=op.f("fk_stickies_org_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_stickies_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stickies")),
    )
    op.create_index(op.f("ix_stickies_org_id"), "stickies", ["org_id"], unique=False)
    op.create_index(op.f("ix_stickies_user_id"), "stickies", ["user_id"], unique=False)
