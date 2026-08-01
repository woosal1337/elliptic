"""AI key, AI user, and AI run schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.ai.models import AIProviderType, AIRunPurpose, AIRunStatus, ChatMode
from elliptic.modules.storage.schemas import StoredObjectOut

TransformAction = Literal["rephrase", "summarize", "expand", "translate", "fix_grammar"]


class AITransformIn(BaseModel):
    """Payload for an in-editor AI text transform."""

    text: str = Field(min_length=1, max_length=20000)
    action: TransformAction
    target_language: str = Field(default="English", max_length=40)


class AIGenerateIn(BaseModel):
    """Payload for an in-editor AI block (generate content from a prompt)."""

    prompt: str = Field(min_length=1, max_length=2000)
    context: str | None = Field(default=None, max_length=20000)


class AITransformOut(BaseModel):
    """Transformed/generated text + the AI run that produced it."""

    result: str
    ai_run_id: uuid.UUID


class AIProviderConfig(BaseModel):
    """Optional BYO-LLM provider configuration (endpoint/region/models)."""

    base_url: str | None = Field(default=None, max_length=500)
    region: str | None = Field(default=None, max_length=50)
    chat_model: str | None = Field(default=None, max_length=100)
    embedding_model: str | None = Field(default=None, max_length=100)
    embedding_dimensions: int | None = Field(default=None, ge=1, le=8192)


class AIKeyCreateIn(AIProviderConfig):
    """Payload to store a BYOK provider key; the key itself is write-only."""

    provider: AIProviderType
    name: str = Field(min_length=1, max_length=100)
    api_key: str = Field(min_length=8, max_length=512)
    is_default: bool = False
    validate_key: bool = False


class AIKeyUpdateIn(AIProviderConfig):
    """Editable key metadata + provider configuration."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_default: bool | None = None


class AIKeyOut(BaseModel):
    """Masked provider key representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider: AIProviderType
    name: str
    last4: str
    is_default: bool
    base_url: str | None = None
    region: str | None = None
    chat_model: str | None = None
    embedding_model: str | None = None
    embedding_dimensions: int | None = None
    created_at: datetime


class AIUserCreateIn(BaseModel):
    """Payload to define an AI agent member."""

    name: str = Field(min_length=1, max_length=100)
    provider: AIProviderType
    model: str = Field(min_length=1, max_length=100)
    system_prompt: str = Field(min_length=1)
    is_active: bool = True


class AIUserUpdateIn(BaseModel):
    """Editable AI user fields."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    system_prompt: str | None = None
    is_active: bool | None = None
    budget_monthly_cents: int | None = Field(default=None, ge=0)


class AIUserOut(BaseModel):
    """Serialized AI user."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    provider: AIProviderType
    model: str
    system_prompt: str
    is_active: bool
    budget_monthly_cents: int | None = None
    created_at: datetime


class AIRunOut(BaseModel):
    """Serialized AI run."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    provider: AIProviderType
    model: str
    purpose: AIRunPurpose
    input_tokens: int | None
    output_tokens: int | None
    status: AIRunStatus
    error: str | None
    created_at: datetime


class RoutingIn(BaseModel):
    """Item to suggest a project route for."""

    kind: Literal["task", "meeting"]
    id: uuid.UUID


class RouteSuggestionOut(BaseModel):
    """A suggested project route with a 0..1 confidence."""

    project_id: uuid.UUID | None
    route: str | None
    confidence: float


class ContextSignalOut(BaseModel):
    """One piece of related context surfaced at a decision point."""

    kind: Literal["related_task", "related_meeting", "related_note"]
    id: uuid.UUID
    title: str
    detail: str | None = None


class CoverageOut(BaseModel):
    """How much was relevant out of how much was scanned."""

    consulted: int
    total: int


class ContextAggregationOut(BaseModel):
    """AI-aggregated context with explicit coverage and a 0..1 confidence."""

    signals: list[ContextSignalOut]
    confidence: float
    coverage: CoverageOut


class ChatConversationCreateIn(BaseModel):
    """Start an AI chat conversation (COS-206)."""

    title: str = Field(default="New chat", max_length=255)
    mode: ChatMode = ChatMode.ASK


class ChatConversationOut(BaseModel):
    """Serialized conversation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    mode: ChatMode
    pinned: bool = False
    auto_run: bool = False
    created_at: datetime
    updated_at: datetime


class ChatConversationUpdateIn(BaseModel):
    """Rename / re-mode / pin a conversation (COS-231)."""

    title: str | None = Field(default=None, max_length=255)
    mode: ChatMode | None = None
    pinned: bool | None = None
    auto_run: bool | None = None


class ChatMention(BaseModel):
    """An @-referenced workspace entity that scopes a chat message (COS-227)."""

    type: str = Field(pattern="^(task|project)$")
    id: uuid.UUID


class ChatMessageIn(BaseModel):
    """Send a message to a conversation."""

    content: str = Field(min_length=1, max_length=8000)
    mentions: list[ChatMention] = Field(default_factory=list, max_length=20)
    object_ids: list[uuid.UUID] = Field(default_factory=list, max_length=10)


class ChatFeedbackIn(BaseModel):
    """Thumbs feedback on an assistant message (COS-231)."""

    value: int = Field(ge=-1, le=1)


class ChatMessageOut(BaseModel):
    """Serialized chat message."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    feedback: int = 0
    attachments: list[StoredObjectOut] = []
    created_at: datetime


class EstimateSuggestIn(BaseModel):
    """Request an AI-suggested estimate for a work item (COS-168)."""

    task_id: uuid.UUID


class EstimateSuggestOut(BaseModel):
    """An AI estimate suggestion mapped to the project's scale."""

    suggestion: str | None
    raw: str
    scale: list[str]
    ai_run_id: uuid.UUID


class AIUsageOut(BaseModel):
    """Per-seat AI credit pool usage for the current month (COS-264)."""

    used: int
    limit: int
    remaining: int
    billable_seats: int
    credits_per_seat: int
    period_start: datetime
    percent_used: float


class AIChartIn(BaseModel):
    """Natural-language chart request (COS-237)."""

    prompt: str = Field(min_length=1, max_length=500)


class AIChartPoint(BaseModel):
    key: str
    value: int


class AIChartOut(BaseModel):
    """An AI-chosen chart grounded in real workspace data."""

    title: str
    metric: str
    dimension: str
    points: list[AIChartPoint]
    ai_run_id: uuid.UUID


class ActionProposeIn(BaseModel):
    """Ask the assistant to propose a Build-mode action (COS-212)."""

    prompt: str = Field(min_length=1, max_length=2000)


class ActionProposalOut(BaseModel):
    """A proposed action, previewable before execution."""

    action: str
    params: dict[str, object]
    summary: str
    ai_run_id: uuid.UUID


class ActionExecuteIn(BaseModel):
    """Confirm and execute a proposed action."""

    action: str = Field(max_length=50)
    params: dict[str, object]


class ActionResultOut(BaseModel):
    """The result of an executed action."""

    action: str
    task_id: uuid.UUID
    identifier: str
    title: str


class RunActionIn(BaseModel):
    """Auto-run a Build-mode action from a prompt (COS-221)."""

    prompt: str = Field(min_length=1, max_length=2000)


class RunActionOut(BaseModel):
    """A batch-review entry: the proposal summary + executed result."""

    summary: str
    result: ActionResultOut


class WebSearchIn(BaseModel):
    """Search the web from the assistant (COS-258)."""

    query: str = Field(min_length=1, max_length=400)


class WebSource(BaseModel):
    title: str
    snippet: str
    url: str


class WebSearchOut(BaseModel):
    """A web-grounded answer + its sources."""

    query: str
    answer: str
    sources: list[WebSource]


class DocAssistIn(BaseModel):
    """Ask the page-anchored assistant about / to edit a note (COS-254)."""

    note_id: uuid.UUID
    content: str = Field(default="", max_length=20000)
    question: str = Field(min_length=1, max_length=4000)
    selection: str | None = Field(default=None, max_length=4000)


class DocAssistOut(BaseModel):
    answer: str
    ai_run_id: uuid.UUID
