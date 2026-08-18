"""Meeting, transcript segment, and meeting summary models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    false,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import Base, BaseModel


class MeetingSource(enum.StrEnum):
    """Origin of a meeting record."""

    FOLIO = "folio"
    MANUAL = "manual"


meeting_attendees = Table(
    "meeting_attendees",
    Base.metadata,
    Column(
        "meeting_id",
        ForeignKey("meetings.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
)


class Meeting(BaseModel):
    """A meeting with optional transcript, imported from Folio or created manually."""

    __tablename__ = "meetings"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[MeetingSource] = mapped_column(
        Enum(MeetingSource, native_enum=False, length=20), default=MeetingSource.MANUAL
    )
    external_attendees: Mapped[list[str]] = mapped_column(JSONB, default=list)
    raw_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class TranscriptSegment(BaseModel):
    """One speaker-attributed segment of a meeting transcript."""

    __tablename__ = "transcript_segments"

    meeting_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    speaker: Mapped[str] = mapped_column(String(255))
    start_seconds: Mapped[float] = mapped_column(Float)
    end_seconds: Mapped[float] = mapped_column(Float)
    text: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)


class MeetingShare(BaseModel):
    """A public, tokenized share of a meeting with tiered guest access.

    Guests see the summary, action items, and decisions; the raw transcript is
    hidden unless ``include_transcript`` is set. Revoking disables guest access
    without deleting the record.
    """

    __tablename__ = "meeting_shares"
    __table_args__ = (UniqueConstraint("meeting_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    include_transcript: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
