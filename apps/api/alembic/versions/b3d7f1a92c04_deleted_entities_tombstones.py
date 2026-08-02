"""record deletions in their own table instead of tombstoning rows

The previous migration added ``deleted_at`` to tasks and notes so a delta feed
could report removals. Auditing what that would actually mean killed the idea:

* 16 ``ON DELETE CASCADE`` foreign keys point at ``tasks`` and 6 at ``notes``.
  They fire today. If a delete became ``deleted_at = now()`` none of them would,
  leaving live children pointing at a row the user believes is gone.
* Both are self-referential (``tasks.parent_task_id``, ``notes.parent_id``), so
  today deleting a parent removes the whole subtree. Soft-deleting the parent
  would leave a live orphan subtree instead.
* Unique constraints keep matching a tombstoned row, so deleting project BENCH
  and creating a new BENCH would fail.
* Every read query in the codebase would need a ``deleted_at IS NULL`` filter,
  and missing one anywhere silently resurrects deleted data.

Writing the deletion to its own table instead avoids all four. The row is still
really deleted, the cascades still fire, no read path changes at all, and the
sync feed gets exactly what it needed: a record that something went away.

Revision ID: b3d7f1a92c04
Revises: a1c9e4f70b21
Create Date: 2026-08-03 01:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3d7f1a92c04"
down_revision: str | None = "a1c9e4f70b21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "deleted_entities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("org_id", sa.Uuid(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("deleted_by", sa.Uuid(), nullable=True),
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
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # The delta query: everything this org deleted since a cursor.
    op.create_index(
        "ix_deleted_entities_org_changed",
        "deleted_entities",
        ["org_id", "created_at", "id"],
    )
    op.create_index(
        "ix_deleted_entities_lookup", "deleted_entities", ["org_id", "entity_type", "entity_id"]
    )

    # Never populated — nothing ever wrote to them, so dropping loses nothing.
    for table in ("tasks", "notes"):
        op.drop_index(f"ix_{table}_deleted_at", table_name=table)
        op.drop_column(table, "deleted_at")


def downgrade() -> None:
    for table in ("tasks", "notes"):
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index(
            f"ix_{table}_deleted_at",
            table,
            ["deleted_at"],
            postgresql_where=sa.text("deleted_at IS NOT NULL"),
        )

    op.drop_index("ix_deleted_entities_lookup", table_name="deleted_entities")
    op.drop_index("ix_deleted_entities_org_changed", table_name="deleted_entities")
    op.drop_table("deleted_entities")
