"""Custom roles + granular permission schemes (COS-176)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ConflictError, NotFoundError
from elliptic.modules.orgs.models import CustomRole, OrganizationMember, OrgRole

PERMISSION_CATALOG: list[dict[str, str]] = [
    {"key": "projects.create", "label": "Create projects"},
    {"key": "projects.delete", "label": "Delete projects"},
    {"key": "tasks.create", "label": "Create work items"},
    {"key": "tasks.delete", "label": "Delete work items"},
    {"key": "tasks.assign", "label": "Assign work items"},
    {"key": "members.invite", "label": "Invite members"},
    {"key": "members.remove", "label": "Remove members"},
    {"key": "notes.publish", "label": "Publish pages"},
    {"key": "automations.manage", "label": "Manage automations"},
    {"key": "billing.manage", "label": "Manage billing & plan"},
    {"key": "ai.manage", "label": "Manage AI providers"},
    {"key": "integrations.manage", "label": "Manage integrations"},
]
_VALID = {p["key"] for p in PERMISSION_CATALOG}

_MEMBER_BASE = {"projects.create", "tasks.create", "tasks.assign", "notes.publish"}


def _clean(permissions: list[str]) -> list[str]:
    seen: list[str] = []
    for perm in permissions:
        if perm in _VALID and perm not in seen:
            seen.append(perm)
    return seen


async def list_roles(session: AsyncSession, ctx: OrgContext) -> list[CustomRole]:
    result = await session.scalars(
        select(CustomRole).where(CustomRole.org_id == ctx.org.id).order_by(CustomRole.name)
    )
    return list(result)


async def create_role(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    name: str,
    description: str | None,
    permissions: list[str],
    matrix: dict[str, dict[str, str]] | None = None,
) -> CustomRole:
    existing = await session.scalar(
        select(CustomRole).where(CustomRole.org_id == ctx.org.id, CustomRole.name == name)
    )
    if existing is not None:
        raise ConflictError("A role with this name already exists")
    role = CustomRole(
        org_id=ctx.org.id,
        name=name,
        description=description,
        permissions=_clean(permissions),
        matrix=clean_matrix(matrix or {}),
    )
    session.add(role)
    await session.flush()
    return role


async def update_role(
    session: AsyncSession,
    ctx: OrgContext,
    role_id: uuid.UUID,
    *,
    name: str | None,
    description: str | None,
    permissions: list[str] | None,
    matrix: dict[str, dict[str, str]] | None = None,
) -> CustomRole:
    role = await _get_role(session, ctx, role_id)
    if name is not None:
        role.name = name
    if description is not None:
        role.description = description
    if permissions is not None:
        role.permissions = _clean(permissions)
    if matrix is not None:
        role.matrix = clean_matrix(matrix)
    await session.flush()
    return role


async def _get_role(session: AsyncSession, ctx: OrgContext, role_id: uuid.UUID) -> CustomRole:
    role = await session.scalar(
        select(CustomRole).where(CustomRole.id == role_id, CustomRole.org_id == ctx.org.id)
    )
    if role is None:
        raise NotFoundError("Role not found")
    return role


async def delete_role(session: AsyncSession, ctx: OrgContext, role_id: uuid.UUID) -> None:
    role = await _get_role(session, ctx, role_id)
    await session.delete(role)
    await session.flush()


async def assign_role(
    session: AsyncSession, ctx: OrgContext, user_id: uuid.UUID, role_id: uuid.UUID | None
) -> OrganizationMember:
    member = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == ctx.org.id, OrganizationMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("Member not found")
    if role_id is not None:
        await _get_role(session, ctx, role_id)
    member.custom_role_id = role_id
    await session.flush()
    return member


async def effective_permissions(session: AsyncSession, ctx: OrgContext) -> list[str]:
    """The caller's effective permissions from base role + any custom role (COS-176)."""
    if ctx.member.role in (OrgRole.OWNER, OrgRole.ADMIN):
        return [p["key"] for p in PERMISSION_CATALOG]
    granted = set(_MEMBER_BASE)
    if ctx.member.custom_role_id is not None:
        role = await session.get(CustomRole, ctx.member.custom_role_id)
        if role is not None:
            granted.update(role.permissions)
    return [p["key"] for p in PERMISSION_CATALOG if p["key"] in granted]


async def require_permission(session: AsyncSession, ctx: OrgContext, permission: str) -> None:
    """Raise if the caller lacks a permission (COS-176)."""
    if permission not in _VALID:
        raise BadRequestError(f"Unknown permission: {permission}")
    if permission not in await effective_permissions(session, ctx):
        from elliptic.core.exceptions import ForbiddenError  # noqa: PLC0415

        raise ForbiddenError(f"Missing permission: {permission}")


PERMISSION_CELLS = ("none", "own", "lead", "all")

PERMISSION_MATRIX_SCHEMA: list[dict[str, object]] = [
    {
        "resource": "tasks",
        "label": "Work items",
        "actions": ["create", "read", "update", "delete", "comments", "links", "reactions"],
    },
    {
        "resource": "projects",
        "label": "Projects",
        "actions": ["create", "read", "update", "delete"],
    },
    {"resource": "comments", "label": "Comments", "actions": ["create", "update", "delete"]},
    {"resource": "notes", "label": "Pages", "actions": ["create", "read", "update", "delete"]},
    {"resource": "views", "label": "Views", "actions": ["create", "read", "update", "delete"]},
]


def _schema_actions(row: dict[str, object]) -> set[str]:
    actions = row["actions"]
    return set(actions) if isinstance(actions, list) else set()


_MATRIX_RESOURCES: dict[str, set[str]] = {
    str(row["resource"]): _schema_actions(row) for row in PERMISSION_MATRIX_SCHEMA
}


def clean_matrix(matrix: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    """Keep only known resource/action cells with valid values (COS-182)."""
    cleaned: dict[str, dict[str, str]] = {}
    for resource, actions in (matrix or {}).items():
        allowed = _MATRIX_RESOURCES.get(resource)
        if allowed is None or not isinstance(actions, dict):
            continue
        row = {
            action: cell
            for action, cell in actions.items()
            if action in allowed and cell in PERMISSION_CELLS
        }
        if row:
            cleaned[resource] = row
    return cleaned


async def evaluate_cell(  # noqa: PLR0911
    session: AsyncSession,
    ctx: OrgContext,
    resource: str,
    action: str,
    *,
    owner_id: uuid.UUID | None = None,
    lead_id: uuid.UUID | None = None,
) -> bool:
    """Additive-restrictive matrix check (COS-182).

    Returns True (allow) for owner/admin, and for any member without a custom role
    or whose role leaves this cell unset — so it only ever *narrows* access for
    members an admin has explicitly constrained. A set cell resolves
    none→deny, own→owner-only, lead→lead-only, all→allow.
    """
    if ctx.member.role in (OrgRole.OWNER, OrgRole.ADMIN):
        return True
    if ctx.member.custom_role_id is None:
        return True
    role = await session.get(CustomRole, ctx.member.custom_role_id)
    cell = role.matrix.get(resource, {}).get(action) if role else None
    if cell is None:
        return True
    if cell == "all":
        return True
    if cell == "none":
        return False
    if cell == "own":
        return owner_id == ctx.user.id
    if cell == "lead":
        return lead_id == ctx.user.id
    return True
