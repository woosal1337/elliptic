"""Custom property business logic."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.projects.models import Project
from elliptic.modules.properties.models import CustomProperty, PropertyTemplate, PropertyType
from elliptic.modules.properties.schemas import CustomPropertyCreateIn


async def _validate_project(session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID) -> None:
    row = await session.scalar(
        select(Project.id).where(Project.id == project_id, Project.org_id == ctx.org.id)
    )
    if row is None:
        raise NotFoundError("Project not found")


async def create_property(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, payload: CustomPropertyCreateIn
) -> CustomProperty:
    """Define a custom property for a project."""
    await _validate_project(session, ctx, project_id)
    if payload.type is PropertyType.SELECT and not payload.options:
        raise BadRequestError("Select properties require at least one option")
    prop = CustomProperty(
        org_id=ctx.org.id,
        project_id=project_id,
        name=payload.name,
        type=payload.type,
        options=payload.options,
    )
    session.add(prop)
    await session.flush()
    return prop


async def list_properties(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID
) -> list[CustomProperty]:
    """List a project's custom properties."""
    await _validate_project(session, ctx, project_id)
    result = await session.scalars(
        select(CustomProperty)
        .where(CustomProperty.project_id == project_id, CustomProperty.org_id == ctx.org.id)
        .order_by(CustomProperty.created_at)
    )
    return list(result)


async def delete_property(session: AsyncSession, ctx: OrgContext, property_id: uuid.UUID) -> None:
    """Delete a custom property definition."""
    prop = await session.scalar(
        select(CustomProperty).where(
            CustomProperty.id == property_id, CustomProperty.org_id == ctx.org.id
        )
    )
    if prop is None:
        raise NotFoundError("Property not found")
    await session.delete(prop)
    await session.flush()


async def list_templates(session: AsyncSession, ctx: OrgContext) -> list[PropertyTemplate]:
    """List the org's workspace-level property templates (COS-88)."""
    result = await session.scalars(
        select(PropertyTemplate)
        .where(PropertyTemplate.org_id == ctx.org.id)
        .order_by(PropertyTemplate.name)
    )
    return list(result)


async def create_template(
    session: AsyncSession, ctx: OrgContext, payload: CustomPropertyCreateIn
) -> PropertyTemplate:
    if payload.type is PropertyType.SELECT and not payload.options:
        raise BadRequestError("Select properties require at least one option")
    template = PropertyTemplate(
        org_id=ctx.org.id,
        name=payload.name,
        type=payload.type,
        options=payload.options,
    )
    session.add(template)
    await session.flush()
    return template


async def delete_template(session: AsyncSession, ctx: OrgContext, template_id: uuid.UUID) -> None:
    template = await session.scalar(
        select(PropertyTemplate).where(
            PropertyTemplate.id == template_id, PropertyTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Property template not found")
    await session.delete(template)
    await session.flush()


async def import_template(
    session: AsyncSession, ctx: OrgContext, project_id: uuid.UUID, template_id: uuid.UUID
) -> CustomProperty:
    """Copy a workspace template into a project's custom-property set (COS-88)."""
    await _validate_project(session, ctx, project_id)
    template = await session.scalar(
        select(PropertyTemplate).where(
            PropertyTemplate.id == template_id, PropertyTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Property template not found")
    existing = await session.scalar(
        select(CustomProperty.id).where(
            CustomProperty.project_id == project_id, CustomProperty.name == template.name
        )
    )
    if existing is not None:
        raise BadRequestError("A property with this name already exists in the project")
    prop = CustomProperty(
        org_id=ctx.org.id,
        project_id=project_id,
        name=template.name,
        type=template.type,
        options=list(template.options),
    )
    session.add(prop)
    await session.flush()
    return prop
