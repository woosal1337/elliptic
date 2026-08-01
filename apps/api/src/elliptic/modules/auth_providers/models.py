"""Per-org sign-in provider policy (COS-209)."""

import uuid

from sqlalchemy import Boolean, ForeignKey, UniqueConstraint, false, true
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class AuthProviderConfig(BaseModel):
    """Which sign-in methods an org surfaces + its signup policy (COS-209)."""

    __tablename__ = "auth_provider_configs"
    __table_args__ = (UniqueConstraint("org_id"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    magic_code_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    password_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    google_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    github_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    allow_self_signup: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    restrict_oauth_to_verified_domains: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false()
    )
