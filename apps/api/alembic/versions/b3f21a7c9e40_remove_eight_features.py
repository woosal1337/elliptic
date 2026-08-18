"""remove Assistant, Triage, Initiatives, Releases, Customers, Calendar, Query, Dashboards

Revision ID: b3f21a7c9e40
Revises: a1c7d3e50b94
Create Date: 2026-08-18 12:10:00.000000

Drops the tables and columns behind eight retired features. The AI stack goes
with the Assistant, so meeting summaries, templates and recipes — which existed
only to shape AI output — go too.

This is destructive and one-way: the downgrade recreates the shape, never the
rows. Take a dump first if the data is worth anything.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3f21a7c9e40"
down_revision: str | None = "a1c7d3e50b94"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Children first: every one of these is referenced by the table below it.
TABLES = (
    # Children first: meeting summaries point at ai_runs, and the AI chat tables
    # point back up their own chain, so the order here is the dependency order.
    "meeting_summaries",
    "meeting_recipes",
    "meeting_templates",
    "ai_chat_messages",
    "ai_conversations",
    "ai_runs",
    "ai_provider_keys",
    "ai_users",
    "customer_request_tasks",
    "customer_requests",
    "customers",
    "dashboard_widgets",
    "dashboards",
    "events",
    "initiative_projects",
    "initiative_updates",
    "initiatives",
    "intake_forms",
    "changelog_entries",
    "releases",
)

# Columns that point at those tables, or at features that no longer exist.
COLUMNS = (
    ("tasks", "bot_assignee_id"),
    ("tasks", "release_id"),
    ("tasks", "release_blocker"),
    ("tasks", "is_triage"),
    ("tasks", "triage_resolved_at"),
    ("tasks", "intake_channel"),
    ("projects", "intake_owner_id"),
    ("projects", "intake_enabled"),
    ("projects", "intake_inapp_enabled"),
    ("projects", "intake_token"),
    ("organizations", "ai_enabled"),
)


def upgrade() -> None:
    # Columns before tables: a foreign key would otherwise hold the table down.
    for table, column in COLUMNS:
        op.drop_column(table, column)
    for table in TABLES:
        op.drop_table(table)


def downgrade() -> None:
    """Restore the shape only. The rows are gone; this is here so a stack that
    has not deployed the removal can still step backwards."""
    op.add_column(
        "organizations",
        sa.Column("ai_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("projects", sa.Column("intake_token", sa.String(length=64), nullable=True))
    op.add_column(
        "projects",
        sa.Column("intake_inapp_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "projects",
        sa.Column("intake_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("projects", sa.Column("intake_owner_id", sa.Uuid(), nullable=True))
    op.add_column("tasks", sa.Column("intake_channel", sa.String(length=20), nullable=True))
    op.add_column(
        "tasks", sa.Column("triage_resolved_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "tasks", sa.Column("is_triage", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column(
        "tasks",
        sa.Column("release_blocker", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("tasks", sa.Column("release_id", sa.Uuid(), nullable=True))
    op.add_column("tasks", sa.Column("bot_assignee_id", sa.Uuid(), nullable=True))
