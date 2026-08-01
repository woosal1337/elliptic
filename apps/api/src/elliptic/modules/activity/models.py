"""Append-only activity event model and its NOTIFY trigger."""

import uuid
from typing import Any

from sqlalchemy import DDL, ForeignKey, Index, String, Uuid, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel

NOTIFY_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION companyos_notify_activity() RETURNS trigger AS $func$
BEGIN
  PERFORM pg_notify('companyos_activity', json_build_object(
    'id', NEW.id,
    'org_id', NEW.org_id,
    'project_id', NEW.project_id,
    'actor_id', NEW.actor_id,
    'entity_type', NEW.entity_type,
    'entity_id', NEW.entity_id,
    'event_type', NEW.event_type
  )::text);
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
"""

NOTIFY_TRIGGER_SQL = (
    "CREATE OR REPLACE TRIGGER trg_activity_events_notify "
    "AFTER INSERT ON activity_events "
    "FOR EACH ROW EXECUTE FUNCTION companyos_notify_activity();"
)


class ActivityEvent(BaseModel):
    """One immutable record of a mutation within an organization."""

    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_events_org_created", "org_id", "created_at"),
        Index("ix_activity_events_entity", "org_id", "entity_type", "entity_id"),
        Index("ix_activity_events_org_project_created", "org_id", "project_id", "created_at"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    event_type: Mapped[str] = mapped_column(String(50))
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


event.listen(ActivityEvent.__table__, "after_create", DDL(NOTIFY_FUNCTION_SQL))  # type: ignore[no-untyped-call]
event.listen(ActivityEvent.__table__, "after_create", DDL(NOTIFY_TRIGGER_SQL))  # type: ignore[no-untyped-call]
