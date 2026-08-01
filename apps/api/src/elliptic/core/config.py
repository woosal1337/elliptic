"""Application settings loaded from environment variables."""

import base64
from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

KEK_BYTE_LENGTH = 32
INSECURE_DEV_SECRET = "insecure-dev-secret"  # noqa: S105
WEAK_JWT_SECRETS = frozenset({INSECURE_DEV_SECRET, "local-dev-jwt-secret-change-in-production"})


class Settings(BaseSettings):
    """Runtime configuration for the Elliptic API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Aliased fields must still accept their own name, or passing one
        # explicitly is silently ignored in favour of the environment.
        populate_by_name=True,
    )

    database_url: str = "postgresql+asyncpg://companyos:companyos@localhost:5434/companyos"
    elliptic_kek: str = Field(
        default="",
        validation_alias=AliasChoices("ELLIPTIC_KEK", "COMPANYOS_KEK"),
    )
    jwt_secret_key: str = INSECURE_DEV_SECRET
    env: Literal["development", "test", "production"] = "development"
    cors_origins: str = "http://localhost:3000"

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    oauth_issuer: str = "http://localhost:8000"
    # Canonical MCP resource URI (RFC 8707/9728): the full URL clients connect
    # to, including the /api/v1/mcp path. Must match what MCP clients send as the
    # `resource` param at /oauth/authorize, else the flow 400s. Override per env.
    mcp_resource_base: str = "http://localhost:8000/api/v1/mcp"
    mcp_access_token_expire_minutes: int = 10
    mcp_refresh_token_expire_days: int = 30

    log_level: str = "INFO"

    ai_timeout_seconds: float = 60.0
    ai_max_context_chars: int = 60000
    ai_max_output_tokens: int = 2048
    notify_timeout_seconds: float = 10.0
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_base_url: str = "https://api.anthropic.com"
    openai_default_model: str = "gpt-4o-mini"
    anthropic_default_model: str = "claude-opus-4-8"

    slack_base_url: str = "https://slack.com/api"
    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_redirect_uri: str = ""
    slack_signing_secret: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = ""

    app_base_url: str = "http://localhost:3000"
    # URL scheme of the mobile app, used to hand a native sign-in back to it.
    native_app_scheme: str = "companyos"
    instance_admin_emails: str = ""

    resend_api_key: str = ""
    email_from: str = "Elliptic <noreply@example.com>"
    verification_code_ttl_minutes: int = 15

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "elliptic-media"
    r2_endpoint_url: str = ""
    push_enabled: bool = False
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"

    file_size_limit_bytes: int = 25 * 1024 * 1024
    allowed_upload_content_types: str = (
        "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,"
        "application/pdf,text/plain,text/csv,text/markdown,"
        "application/zip,application/json,"
        "application/msword,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

    @field_validator("elliptic_kek")
    @classmethod
    def _validate_kek(cls, value: str) -> str:
        if value:
            decoded = base64.urlsafe_b64decode(value.encode())
            if len(decoded) != KEK_BYTE_LENGTH:
                msg = "ELLIPTIC_KEK must decode to exactly 32 bytes"
                raise ValueError(msg)
        return value

    @model_validator(mode="after")
    def _require_production_secrets(self) -> "Settings":
        if self.env != "production":
            return self
        if not self.jwt_secret_key or self.jwt_secret_key in WEAK_JWT_SECRETS:
            msg = "JWT_SECRET_KEY must be set to a strong secret in production"
            raise ValueError(msg)
        if not self.elliptic_kek:
            msg = "ELLIPTIC_KEK must be set to a 32-byte urlsafe base64 key in production"
            raise ValueError(msg)
        if "*" in self.cors_origin_list:
            msg = "CORS_ORIGINS must not be a wildcard while credentials are allowed"
            raise ValueError(msg)
        return self

    @property
    def kek_bytes(self) -> bytes:
        if not self.elliptic_kek:
            msg = "ELLIPTIC_KEK is not configured"
            raise RuntimeError(msg)
        return base64.urlsafe_b64decode(self.elliptic_kek.encode())

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_upload_content_type_set(self) -> set[str]:
        return {ct.strip() for ct in self.allowed_upload_content_types.split(",") if ct.strip()}

    @property
    def storage_configured(self) -> bool:
        return bool(self.r2_endpoint_url and self.r2_access_key_id and self.r2_secret_access_key)


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance."""
    return Settings()
