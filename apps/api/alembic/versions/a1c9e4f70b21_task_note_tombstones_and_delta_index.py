"""task and note tombstones, plus indexes for delta sync

Tasks and notes were hard-deleted, which is fine while every client asks for a
full list but is wrong the moment one asks "what changed since X": a row that
was removed leaves no trace, so a client that already holds it never learns to
drop it and shows it forever.

Projects already work this way (``deleted_at`` plus the SAFE-06 purge job).
This extends the same pattern to tasks and notes.

The composite ``(org_id, updated_at, id)`` indexes back the delta query. The id
is part of the key because two rows can share a millisecond; ordering on the
pair makes the cursor exact rather than approximately right.

Deliberately additive: new nullable columns and new indexes only. No existing
row is read or rewritten, so this is safe to apply to a live database and safe
to roll back.

Revision ID: a1c9e4f70b21
Revises: c7f1a9d2b815
Create Date: 2026-08-03 00:55:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1c9e4f70b21"
down_revision: str | None = "c7f1a9d2b815"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TOMBSTONED = ("tasks", "notes")


def upgrade() -> None:
    for table in _TOMBSTONED:
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        # Partial: the overwhelming majority of rows are live, and a delta reader
        # asking for tombstones only cares about the few that are not.
        op.create_index(
            f"ix_{table}_deleted_at",
            table,
            ["deleted_at"],
            postgresql_where=sa.text("deleted_at IS NOT NULL"),
        )

    # Every table a delta feed can serve, whether or not it has tombstones.
    for table in ("tasks", "notes", "projects"):
        op.create_index(f"ix_{table}_org_changed", table, ["org_id", "updated_at", "id"])


def downgrade() -> None:
    for table in ("tasks", "notes", "projects"):
        op.drop_index(f"ix_{table}_org_changed", table_name=table)

    for table in _TOMBSTONED:
        op.drop_index(f"ix_{table}_deleted_at", table_name=table)
        op.drop_column(table, "deleted_at")
