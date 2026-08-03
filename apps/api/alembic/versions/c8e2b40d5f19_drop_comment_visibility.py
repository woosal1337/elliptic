"""drop comment visibility

Comments had an internal/external flag. It never affected members — everyone in
a project already saw every comment — and only narrowed what a GUEST-role member
could read. The control for it sat next to the Comment button and read as though
it hid notes from teammates, which it did not.

Removed at the owner's direction, with the consequence understood: a guest can
now read every comment on anything they can reach.

Irreversible for the record of which comments were external — downgrade restores
the column with everything defaulted to internal, which is the safe direction to
be wrong in.

Revision ID: c8e2b40d5f19
Revises: b3d7f1a92c04
Create Date: 2026-08-03 02:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8e2b40d5f19"
down_revision: str | None = "b3d7f1a92c04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("comments", "visibility")


def downgrade() -> None:
    op.add_column(
        "comments",
        sa.Column(
            "visibility",
            sa.String(length=20),
            nullable=False,
            server_default="INTERNAL",
        ),
    )
