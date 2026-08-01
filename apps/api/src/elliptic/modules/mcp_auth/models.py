"""OAuth 2.1 authorization-server models for the Elliptic MCP."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class ClientRegistrationType(enum.StrEnum):
    """How an OAuth client came to exist."""

    DCR = "dcr"
    CIMD = "cimd"
    PREREGISTERED = "preregistered"


class GrantStatus(enum.StrEnum):
    """Lifecycle status of a consent grant family."""

    ACTIVE = "active"
    REVOKED = "revoked"


class SigningKeyStatus(enum.StrEnum):
    """Rotation status of an RS256 signing key."""

    ACTIVE = "active"
    NEXT = "next"
    RETIRED = "retired"


class OAuthClient(BaseModel):
    """A registered AI client (DCR loopback, CIMD url, or pre-registered)."""

    __tablename__ = "oauth_clients"

    client_id: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    registration_type: Mapped[ClientRegistrationType] = mapped_column(
        Enum(ClientRegistrationType, native_enum=False, length=20)
    )
    client_name: Mapped[str] = mapped_column(String(255))
    client_uri: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    logo_uri: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    redirect_uris: Mapped[list[str]] = mapped_column(JSONB)
    grant_types: Mapped[list[str]] = mapped_column(JSONB)
    token_endpoint_auth_method: Mapped[str] = mapped_column(String(40), default="none")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    client_secret_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)


class OAuthGrant(BaseModel):
    """A durable consent record.

    A single-org grant is one per (client, user, org). A multi-org grant
    (``cross_org=True``, ``org_id=NULL``) is one per (client, user) and authorizes
    the user's scopes across every organization they belong to. Partial unique
    indexes enforce both shapes independently.
    """

    __tablename__ = "oauth_grants"
    __table_args__ = (
        Index(
            "uq_oauth_grants_client_user_org",
            "client_id",
            "user_id",
            "org_id",
            unique=True,
            postgresql_where=text("org_id IS NOT NULL"),
        ),
        Index(
            "uq_oauth_grants_client_user_cross",
            "client_id",
            "user_id",
            unique=True,
            postgresql_where=text("cross_org"),
        ),
        Index("ix_oauth_grants_user_org", "user_id", "org_id"),
    )

    client_id: Mapped[str] = mapped_column(String(512), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True
    )
    cross_org: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    scopes: Mapped[list[str]] = mapped_column(JSONB)
    status: Mapped[GrantStatus] = mapped_column(
        Enum(GrantStatus, native_enum=False, length=20), default=GrantStatus.ACTIVE
    )
    granted_by: Mapped[str] = mapped_column(String(40), default="self")
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(String(40), nullable=True)


class OAuthAuthorizationCode(BaseModel):
    """A short-lived, single-use PKCE authorization code."""

    __tablename__ = "oauth_authorization_codes"

    code_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    client_id: Mapped[str] = mapped_column(String(512))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    scopes: Mapped[list[str]] = mapped_column(JSONB)
    redirect_uri: Mapped[str] = mapped_column(String(2000))
    code_challenge: Mapped[str] = mapped_column(String(128))
    code_challenge_method: Mapped[str] = mapped_column(String(10), default="S256")
    resource: Mapped[str] = mapped_column(String(512))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OAuthAccessToken(BaseModel):
    """Issued-access-token registry enabling O(1) revocation and audit."""

    __tablename__ = "oauth_access_tokens"
    __table_args__ = (Index("ix_oauth_access_tokens_grant", "grant_id"),)

    jti: Mapped[uuid.UUID] = mapped_column(unique=True, index=True)
    grant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("oauth_grants.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    client_id: Mapped[str] = mapped_column(String(512))
    scopes: Mapped[list[str]] = mapped_column(JSONB)
    resource: Mapped[str] = mapped_column(String(512))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OAuthRefreshToken(BaseModel):
    """A rotating refresh token with reuse detection across a family."""

    __tablename__ = "oauth_refresh_tokens"
    __table_args__ = (Index("ix_oauth_refresh_tokens_family", "family_id"),)

    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    grant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("oauth_grants.id", ondelete="CASCADE"))
    family_id: Mapped[uuid.UUID] = mapped_column()
    replaced_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    client_id: Mapped[str] = mapped_column(String(512))
    scopes: Mapped[list[str]] = mapped_column(JSONB)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OAuthSigningKey(BaseModel):
    """An RS256 signing keypair; the private half is AES-256-GCM encrypted at rest."""

    __tablename__ = "oauth_signing_keys"

    kid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    algorithm: Mapped[str] = mapped_column(String(10), default="RS256")
    public_jwk: Mapped[dict[str, str]] = mapped_column(JSONB)
    encrypted_private_key: Mapped[bytes] = mapped_column(LargeBinary)
    nonce: Mapped[bytes] = mapped_column(LargeBinary)
    status: Mapped[SigningKeyStatus] = mapped_column(
        Enum(SigningKeyStatus, native_enum=False, length=20), default=SigningKeyStatus.ACTIVE
    )
