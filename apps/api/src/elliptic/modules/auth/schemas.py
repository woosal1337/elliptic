"""Auth request and response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    """Payload to create a new account."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class LoginIn(BaseModel):
    """Payload to authenticate."""

    email: EmailStr
    password: str
    code: str | None = None


class RefreshIn(BaseModel):
    """Optional body for token refresh when not using cookies."""

    refresh_token: str | None = None


class VerifyEmailIn(BaseModel):
    """Payload to confirm an email verification code."""

    email: EmailStr
    code: str


class ResendVerificationIn(BaseModel):
    """Payload to request a fresh email verification code."""

    email: EmailStr


class TokenPair(BaseModel):
    """Issued access and refresh tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105


class UserOut(BaseModel):
    """Public user representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    email_verified: bool
    totp_enabled: bool = False
    locale: str = "en"
    created_at: datetime


class LoginOut(BaseModel):
    """Login response with user and tokens.

    When the account has 2FA enabled and no valid code was supplied,
    ``two_factor_required`` is true and ``tokens``/``user`` are omitted (COS-214).
    """

    user: UserOut | None = None
    tokens: TokenPair | None = None
    two_factor_required: bool = False


class TwoFactorSetupOut(BaseModel):
    """Enrollment payload for an authenticator app."""

    secret: str
    otpauth_uri: str


class TwoFactorVerifyIn(BaseModel):
    """A TOTP code to enable/disable 2FA."""

    code: str = Field(min_length=6, max_length=10)
