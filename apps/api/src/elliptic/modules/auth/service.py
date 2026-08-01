"""Account registration and credential verification."""

import asyncio
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core import totp
from elliptic.core.config import get_settings
from elliptic.core.email import deliver_email
from elliptic.core.email_templates import render_verification_email
from elliptic.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    UnauthorizedError,
)
from elliptic.core.security import hash_password, verify_password
from elliptic.modules.auth.schemas import LoginIn, RegisterIn
from elliptic.modules.users.models import User

_CODE_UPPER_BOUND = 1_000_000


def email_verification_required() -> bool:
    """Email OTP is enforced only when a Resend API key is configured.

    With no key (dev/test or an unconfigured prod) registration auto-verifies and
    behaviour is unchanged. The feature turns on automatically once RESEND_API_KEY
    is set, which is what makes it safe to merge before the key exists.
    """
    return bool(get_settings().resend_api_key)


def _generate_code() -> str:
    """Return a fresh 6-digit verification code."""
    return f"{secrets.randbelow(_CODE_UPPER_BOUND):06d}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


async def _issue_verification_code(user: User) -> None:
    """Set a fresh code + expiry on the user and email it. Never raises."""
    ttl = get_settings().verification_code_ttl_minutes
    code = _generate_code()
    user.verification_code_hash = _hash_code(code)
    user.verification_expires_at = datetime.now(UTC) + timedelta(minutes=ttl)
    try:
        subject, html = render_verification_email(code=code, expires_in=f"{ttl} minutes")
        await asyncio.to_thread(
            deliver_email,
            user.email,
            subject,
            f"Your Elliptic verification code is {code}",
            html=html,
        )
    except Exception:
        logger.exception("Failed to send verification email to {}", user.email)


async def register_user(session: AsyncSession, payload: RegisterIn) -> User:
    """Create a new user account with a hashed password."""
    email = payload.email.lower()
    existing = await session.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise ConflictError("An account with this email already exists")
    user = User(
        email=email, password_hash=hash_password(payload.password), full_name=payload.full_name
    )
    session.add(user)
    await session.flush()
    if email_verification_required():
        user.email_verified = False
        await _issue_verification_code(user)
    else:
        user.email_verified = True
    return user


async def verify_email(session: AsyncSession, email: str, code: str) -> User:
    """Confirm a verification code and mark the account verified."""
    user = await session.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        raise BadRequestError("Invalid verification code")
    if not email_verification_required():
        user.email_verified = True
        return user
    if user.verification_code_hash is None or (
        user.verification_expires_at is not None
        and user.verification_expires_at < datetime.now(UTC)
    ):
        raise BadRequestError("Verification code expired; request a new one")
    if _hash_code(code) != user.verification_code_hash:
        raise BadRequestError("Invalid verification code")
    user.email_verified = True
    user.verification_code_hash = None
    user.verification_expires_at = None
    await session.flush()
    return user


async def resend_verification(session: AsyncSession, email: str) -> None:
    """Reissue a verification code if the account exists and is unverified.

    A missing or already-verified account is a silent no-op so the endpoint never
    reveals whether an email is registered.
    """
    user = await session.scalar(select(User).where(User.email == email.lower()))
    if user is None or not email_verification_required() or user.email_verified:
        return
    await _issue_verification_code(user)
    await session.flush()


async def authenticate(session: AsyncSession, payload: LoginIn) -> User:
    """Verify credentials and return the user, or raise 401."""
    user = await session.scalar(select(User).where(User.email == payload.email.lower()))
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise UnauthorizedError("Invalid email or password")
    if email_verification_required() and not user.email_verified:
        raise ForbiddenError("Email not verified")
    return user


async def start_totp_setup(session: AsyncSession, user: User) -> str:
    """Generate (or reuse) a pending TOTP secret for enrollment; returns the secret (COS-214)."""
    if not user.totp_secret or user.totp_enabled:
        user.totp_secret = totp.generate_secret()
        await session.flush()
    return user.totp_secret


def verify_totp(user: User, code: str) -> bool:
    """Whether a TOTP code matches the user's secret."""
    if not user.totp_secret:
        return False
    return totp.verify(user.totp_secret, code)


async def enable_totp(session: AsyncSession, user: User, code: str) -> None:
    """Enable 2FA after verifying a code against the pending secret."""
    if not user.totp_secret or not totp.verify(user.totp_secret, code):
        raise BadRequestError("Invalid verification code")
    user.totp_enabled = True
    await session.flush()


async def disable_totp(session: AsyncSession, user: User, code: str) -> None:
    """Disable 2FA after verifying a current code."""
    if not user.totp_enabled or not verify_totp(user, code):
        raise BadRequestError("Invalid verification code")
    user.totp_enabled = False
    user.totp_secret = None
    await session.flush()
