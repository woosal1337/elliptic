"""Notification preferences govern push, not email.

Email delivery is switched off, so these five toggles now decide which push
categories a user receives. Renamed rather than replaced: the rows already carry
each user's choices, and the semantics — per-trigger, project overriding
workspace — are unchanged. Only the transport they gate is different.

Revision ID: c9d2f4a71b03
Revises: a3c7e1b9d240
"""

from alembic import op

revision = "c9d2f4a71b03"
down_revision = "a3c7e1b9d240"
branch_labels = None
depends_on = None

_FIELDS = ("property_change", "state_change", "completed", "comments", "mentions")


def upgrade() -> None:
    for field in _FIELDS:
        op.alter_column(
            "notification_preferences", f"email_{field}", new_column_name=f"notify_{field}"
        )


def downgrade() -> None:
    for field in _FIELDS:
        op.alter_column(
            "notification_preferences", f"notify_{field}", new_column_name=f"email_{field}"
        )
