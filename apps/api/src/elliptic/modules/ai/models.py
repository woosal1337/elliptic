"""BYOK provider key, AI user, and AI run models."""

import enum
import uuid

from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Integer,
    LargeBinary,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class AIProviderType(enum.StrEnum):
    """Supported AI providers. OLLAMA/CUSTOM are OpenAI-compatible (base_url)."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    CUSTOM = "custom"
    BEDROCK = "bedrock"


class AIRunPurpose(enum.StrEnum):
    """Purpose classification of an AI run."""

    SUMMARIZE = "summarize"
    CHAT = "chat"


class AIRunStatus(enum.StrEnum):
    """Lifecycle status of an AI run."""

    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class AIProviderKey(BaseModel):
    """An encrypted BYOK provider API key owned by an organization."""

    __tablename__ = "ai_provider_keys"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[AIProviderType] = mapped_column(
        Enum(AIProviderType, native_enum=False, length=20)
    )
    name: Mapped[str] = mapped_column(String(100))
    encrypted_key: Mapped[bytes] = mapped_column(LargeBinary)
    nonce: Mapped[bytes] = mapped_column(LargeBinary)
    last4: Mapped[str] = mapped_column(String(4))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    region: Mapped[str | None] = mapped_column(String(50), nullable=True)
    chat_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class AIUser(BaseModel):
    """A custom AI agent member defined by an organization."""

    __tablename__ = "ai_users"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    provider: Mapped[AIProviderType] = mapped_column(
        Enum(AIProviderType, native_enum=False, length=20)
    )
    model: Mapped[str] = mapped_column(String(100))
    system_prompt: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    budget_monthly_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AIRun(BaseModel):
    """One outbound AI provider call with usage accounting."""

    __tablename__ = "ai_runs"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[AIProviderType] = mapped_column(
        Enum(AIProviderType, native_enum=False, length=20)
    )
    model: Mapped[str] = mapped_column(String(100))
    purpose: Mapped[AIRunPurpose] = mapped_column(Enum(AIRunPurpose, native_enum=False, length=20))
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[AIRunStatus] = mapped_column(
        Enum(AIRunStatus, native_enum=False, length=20), default=AIRunStatus.RUNNING
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ChatMode(enum.StrEnum):
    """Pi-Chat-style conversation mode gating mutation (COS-206)."""

    ASK = "ask"
    BUILD = "build"


class AIConversation(BaseModel):
    """A natural-language assistant conversation over the org's workspace (COS-206)."""

    __tablename__ = "ai_conversations"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), default="New chat")
    mode: Mapped[ChatMode] = mapped_column(
        Enum(ChatMode, native_enum=False, length=20),
        default=ChatMode.ASK,
        server_default=ChatMode.ASK.name,
    )
    auto_run: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class AIChatMessage(BaseModel):
    """One turn in an AI conversation."""

    __tablename__ = "ai_chat_messages"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    feedback: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
