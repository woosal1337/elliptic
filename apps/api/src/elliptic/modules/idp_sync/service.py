"""IdP group sync reconcile engine (COS-181)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.idp_sync.models import GroupRoleMapping
from elliptic.modules.projects.models import (
    PROJECT_ROLE_RANK,
    Project,
    ProjectMember,
    ProjectRole,
)


async def list_mappings(session: AsyncSession, ctx: OrgContext) -> list[GroupRoleMapping]:
    result = await session.scalars(
        select(GroupRoleMapping).where(GroupRoleMapping.org_id == ctx.org.id)
    )
    return list(result)


async def create_mapping(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    idp_group: str,
    project_id: uuid.UUID,
    role: ProjectRole,
) -> GroupRoleMapping:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if project is None:
        raise BadRequestError("Project not found in this organization")
    mapping = GroupRoleMapping(
        org_id=ctx.org.id, idp_group=idp_group, project_id=project_id, role=role
    )
    session.add(mapping)
    await session.flush()
    return mapping


async def delete_mapping(session: AsyncSession, ctx: OrgContext, mapping_id: uuid.UUID) -> None:
    mapping = await session.scalar(
        select(GroupRoleMapping).where(
            GroupRoleMapping.id == mapping_id, GroupRoleMapping.org_id == ctx.org.id
        )
    )
    if mapping is None:
        raise NotFoundError("Mapping not found")
    await session.delete(mapping)
    await session.flush()


async def reconcile(  # noqa: PLR0912
    session: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    groups: list[str],
    *,
    auto_remove: bool = False,
    dry_run: bool = False,
) -> dict[str, list[dict[str, str]]]:
    """Reconcile a user's project memberships from their IdP groups (COS-181).

    Highest-role-wins across matching groups. Only ``synced`` rows are touched —
    manual memberships are never modified or removed.
    """
    mappings = list(
        await session.scalars(
            select(GroupRoleMapping).where(
                GroupRoleMapping.org_id == org_id, GroupRoleMapping.idp_group.in_(groups or [""])
            )
        )
    )
    desired: dict[uuid.UUID, ProjectRole] = {}
    for m in mappings:
        if m.idp_group in groups:
            current = desired.get(m.project_id)
            if current is None or PROJECT_ROLE_RANK[m.role] > PROJECT_ROLE_RANK[current]:
                desired[m.project_id] = m.role

    existing = list(
        await session.scalars(
            select(ProjectMember).where(
                ProjectMember.org_id == org_id, ProjectMember.user_id == user_id
            )
        )
    )
    by_project = {pm.project_id: pm for pm in existing}

    adds: list[dict[str, str]] = []
    changes: list[dict[str, str]] = []
    removes: list[dict[str, str]] = []

    for project_id, role in desired.items():
        pm = by_project.get(project_id)
        if pm is None:
            adds.append({"project_id": str(project_id), "role": role.value})
            if not dry_run:
                session.add(
                    ProjectMember(
                        org_id=org_id,
                        project_id=project_id,
                        user_id=user_id,
                        role=role,
                        source="synced",
                    )
                )
        elif pm.source == "synced" and pm.role != role:
            changes.append({"project_id": str(project_id), "role": role.value})
            if not dry_run:
                pm.role = role

    if auto_remove:
        for pm in existing:
            if pm.source == "synced" and pm.project_id not in desired:
                removes.append({"project_id": str(pm.project_id), "role": pm.role.value})
                if not dry_run:
                    await session.delete(pm)

    if not dry_run:
        await session.flush()
    return {"adds": adds, "changes": changes, "removes": removes}
