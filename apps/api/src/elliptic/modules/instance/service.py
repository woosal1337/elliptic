"""Instance administration service (COS-223)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.instance.models import InstanceLicense, InstanceSettings
from elliptic.modules.orgs.models import OrganizationMember
from elliptic.modules.users.models import User


async def get_settings_row(session: AsyncSession) -> InstanceSettings:
    settings = await session.scalar(select(InstanceSettings).limit(1))
    if settings is None:
        settings = InstanceSettings()
        session.add(settings)
        await session.flush()
    return settings


async def update_settings(session: AsyncSession, **fields: object) -> InstanceSettings:
    settings = await get_settings_row(session)
    for key, value in fields.items():
        if value is not None and hasattr(settings, key):
            setattr(settings, key, value)
    await session.flush()
    return settings


async def workspace_creation_allowed(session: AsyncSession) -> bool:
    settings = await session.scalar(select(InstanceSettings).limit(1))
    return settings is None or settings.allow_workspace_creation


async def list_users(session: AsyncSession, limit: int = 200) -> list[dict[str, object]]:
    rows = list(await session.scalars(select(User).order_by(User.created_at).limit(limit)))
    counts = {  # noqa: C416
        uid: count
        for uid, count in await session.execute(
            select(OrganizationMember.user_id, func.count()).group_by(OrganizationMember.user_id)
        )
    }
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "is_instance_admin": u.is_instance_admin,
            "suspended": u.suspended_at is not None,
            "org_count": int(counts.get(u.id, 0)),
            "created_at": u.created_at.isoformat(),
        }
        for u in rows
    ]


async def _get_user(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


async def set_suspended(
    session: AsyncSession, actor: User, user_id: uuid.UUID, suspended: bool
) -> User:
    user = await _get_user(session, user_id)
    if user.id == actor.id and suspended:
        raise BadRequestError("You cannot suspend your own account")
    user.suspended_at = utcnow() if suspended else None
    await session.flush()
    return user


async def set_instance_admin(
    session: AsyncSession, actor: User, user_id: uuid.UUID, is_admin: bool
) -> User:
    user = await _get_user(session, user_id)
    if user.id == actor.id and not is_admin:
        raise BadRequestError("You cannot revoke your own instance-admin access")
    user.is_instance_admin = is_admin
    await session.flush()
    return user


async def air_gapped_enabled(session: AsyncSession) -> bool:
    """True when the instance is in zero-egress air-gapped mode (COS-216)."""
    settings = await session.scalar(select(InstanceSettings).limit(1))
    return settings is not None and settings.air_gapped


async def issue_license(
    session: AsyncSession,  # noqa: ARG001
    *,
    plan: str,
    seats: int,
    licensee: str | None,
    days: int | None,
) -> str:
    """Mint a signed, offline-verifiable license token (no phone-home) — COS-230."""
    import time  # noqa: PLC0415

    import jwt  # noqa: PLC0415

    from elliptic.core.config import get_settings  # noqa: PLC0415

    payload: dict[str, object] = {"plan": plan, "seats": seats, "licensee": licensee}
    if days:
        payload["exp"] = int(time.time()) + days * 86400
    return jwt.encode(payload, get_settings().jwt_secret_key, algorithm="HS256")


async def activate_license(session: AsyncSession, token: str) -> "InstanceLicense":
    """Validate a license token's signature and record it as the active license (COS-230)."""
    import jwt  # noqa: PLC0415

    from elliptic.core.config import get_settings  # noqa: PLC0415
    from elliptic.core.exceptions import BadRequestError  # noqa: PLC0415
    from elliptic.core.models_base import utcnow as _utcnow  # noqa: PLC0415

    try:
        payload = jwt.decode(token, get_settings().jwt_secret_key, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise BadRequestError("Invalid or tampered license key") from exc

    for row in await session.scalars(
        select(InstanceLicense).where(InstanceLicense.active.is_(True))
    ):
        row.active = False

    expires_at = None
    if "exp" in payload:
        from datetime import UTC, datetime  # noqa: PLC0415

        expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=UTC)
    license_row = InstanceLicense(
        plan=str(payload.get("plan", "enterprise")),
        seats=int(payload.get("seats", 0)),
        licensee=payload.get("licensee"),
        expires_at=expires_at,
        token=token,
        active=True,
    )
    session.add(license_row)
    await session.flush()
    _ = _utcnow
    return license_row


async def current_license(session: AsyncSession) -> "InstanceLicense | None":
    row: InstanceLicense | None = await session.scalar(
        select(InstanceLicense).where(InstanceLicense.active.is_(True)).limit(1)
    )
    return row


async def delink_license(session: AsyncSession) -> None:
    """Deactivate the current license (delink) — COS-230."""
    license_row = await current_license(session)
    if license_row is not None:
        license_row.active = False
        await session.flush()
