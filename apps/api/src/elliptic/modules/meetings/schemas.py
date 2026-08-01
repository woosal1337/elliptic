"""Meeting, transcript, import, and AI schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.ai.models import AIProviderType
from elliptic.modules.ai.schemas import CoverageOut
from elliptic.modules.meetings.models import MeetingSource


class MeetingCreateIn(BaseModel):
    """Payload to create a meeting manually."""

    title: str = Field(min_length=1, max_length=500)
    started_at: datetime
    duration_seconds: int | None = Field(default=None, ge=0)
    project_id: uuid.UUID | None = None
    attendee_ids: list[uuid.UUID] = Field(default_factory=list)
    external_attendees: list[str] = Field(default_factory=list)
    raw_markdown: str | None = None


class MeetingUpdateIn(BaseModel):
    """Editable meeting fields."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    started_at: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    project_id: uuid.UUID | None = None
    attendee_ids: list[uuid.UUID] | None = None
    external_attendees: list[str] | None = None
    raw_markdown: str | None = None


class MeetingOut(BaseModel):
    """Serialized meeting."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID | None
    title: str
    started_at: datetime
    duration_seconds: int | None
    source: MeetingSource
    external_attendees: list[str]
    raw_markdown: str | None
    created_by: uuid.UUID
    created_at: datetime


class SegmentImportIn(BaseModel):
    """One transcript segment in the Folio import payload."""

    speaker: str = Field(min_length=1, max_length=255)
    start_seconds: float = Field(ge=0)
    end_seconds: float = Field(ge=0)
    text: str


class FolioImportIn(BaseModel):
    """Folio recorder export payload."""

    title: str = Field(min_length=1, max_length=500)
    started_at: datetime
    duration_seconds: int | None = Field(default=None, ge=0)
    attendees: list[str] = Field(default_factory=list)
    segments: list[SegmentImportIn]
    markdown: str | None = None
    project_id: uuid.UUID | None = None


class SegmentOut(BaseModel):
    """Serialized transcript segment."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    speaker: str
    start_seconds: float
    end_seconds: float
    text: str
    position: int


class TranscriptChapterOut(BaseModel):
    """One labelled jump point in a transcript."""

    label: str
    start_seconds: float
    segment_id: uuid.UUID


class SummarizeIn(BaseModel):
    """Options for meeting summarization."""

    provider: AIProviderType | None = None
    model: str | None = None
    key_id: uuid.UUID | None = None
    template_id: str | None = None
    preserve_human: bool = False


class SummaryLineOut(BaseModel):
    """One AI summary line with its section, provenance, and source segments."""

    text: str
    section: str = ""
    provenance: str = "ai"
    segment_ids: list[str] = Field(default_factory=list)


class SummaryOut(BaseModel):
    """Serialized meeting summary.

    ``summary_lines`` carries the structured, source-anchored form (MA-03); it is
    null for legacy markdown-only summaries, where ``content`` remains the source.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    content: str
    summary_lines: list[SummaryLineOut] | None = None
    model: str
    provider: str
    created_by: uuid.UUID
    ai_run_id: uuid.UUID | None
    created_at: datetime


class ChatMessageIn(BaseModel):
    """One chat message in a meeting chat request."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class MeetingChatIn(BaseModel):
    """Chat-about-a-meeting request."""

    messages: list[ChatMessageIn] = Field(min_length=1)
    provider: AIProviderType | None = None
    model: str | None = None
    key_id: uuid.UUID | None = None


class MeetingChatOut(BaseModel):
    """Chat-about-a-meeting response."""

    reply: str
    model: str
    ai_run_id: uuid.UUID


class RecipeRunIn(BaseModel):
    """Run a saved or ad-hoc recipe prompt against a meeting."""

    prompt: str = Field(min_length=1)
    recipe_id: uuid.UUID | None = None


class OrgChatScopeIn(BaseModel):
    """Optional scope narrowing a cross-meeting question."""

    model_config = ConfigDict(populate_by_name=True)

    project_id: uuid.UUID | None = None
    date_from: datetime | None = Field(default=None, alias="from")
    date_to: datetime | None = Field(default=None, alias="to")
    pinned: list[uuid.UUID] = Field(default_factory=list)


class OrgMeetingChatIn(BaseModel):
    """Cross-meeting chat request."""

    messages: list[ChatMessageIn] = Field(min_length=1)
    scope: OrgChatScopeIn | None = None


class MeetingCitationOut(BaseModel):
    """One cited source segment behind a cross-meeting answer."""

    meeting_id: uuid.UUID
    meeting_title: str | None = None
    segment_id: uuid.UUID | None = None
    start_seconds: float | None = None
    quote: str


class OrgMeetingChatOut(BaseModel):
    """Cross-meeting chat response with citations and coverage."""

    reply: str
    model: str
    ai_run_id: uuid.UUID
    citations: list[MeetingCitationOut]
    coverage: CoverageOut


class ShareCreateIn(BaseModel):
    """Payload to mint a public share link."""

    include_transcript: bool = False


class ShareUpdateIn(BaseModel):
    """Editable share fields: toggle transcript inclusion or revoke."""

    include_transcript: bool | None = None
    revoked: bool | None = None


class MeetingShareOut(BaseModel):
    """Serialized share record (owner view)."""

    model_config = ConfigDict(from_attributes=True)

    token: str
    meeting_id: uuid.UUID
    include_transcript: bool
    revoked: bool
    created_at: datetime


class PublicMeetingShareOut(BaseModel):
    """Guest view of a shared meeting; transcript present only when included."""

    meeting_title: str
    summary: str | None
    action_items: list[str]
    decisions: list[str]
    include_transcript: bool
    transcript: list[SegmentOut]


class PublicChatIn(BaseModel):
    """Guest chat request against a shared meeting."""

    messages: list[ChatMessageIn] = Field(min_length=1)


class PublicChatOut(BaseModel):
    """Guest chat response with a grounding signal."""

    reply: str
    grounded: bool
