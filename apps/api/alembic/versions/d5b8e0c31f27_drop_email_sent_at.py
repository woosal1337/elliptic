"""Drop notifications.email_sent_at.

Notifications are delivered by push. The column existed to record that a
notification had also been emailed, and the job that wrote it is gone — email is
reserved for the account itself (verification, reset, invitations), where there
is no device to push to yet.

Revision ID: d5b8e0c31f27
Revises: c9d2f4a71b03
"""

import sqlalchemy as sa
from alembic import op

revision = "d5b8e0c31f27"
down_revision = "c9d2f4a71b03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("notifications", "email_sent_at")


def downgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
