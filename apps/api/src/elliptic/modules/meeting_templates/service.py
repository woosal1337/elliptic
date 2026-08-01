"""Meeting template business logic and summary-directive resolution."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.meeting_templates.models import MeetingRecipe, MeetingTemplate
from elliptic.modules.meeting_templates.schemas import (
    MeetingRecipeIn,
    MeetingTemplateIn,
    MeetingTemplateUpdateIn,
)

FREEFORM_TEMPLATE_ID = "freeform"

BUILTIN_TEMPLATE_SECTIONS: dict[str, list[str]] = {
    "one-on-one": ["Wins", "Blockers", "Feedback", "Action items"],
    "standup": ["Yesterday", "Today", "Blockers"],
    "customer-call": ["Context", "Pain points", "Requests", "Next steps"],
    "decision": ["Options considered", "Decision", "Rationale", "Owners"],
    "retro": ["What went well", "What didn't", "Action items"],
}


def _directive(sections: list[str], scaffold: str | None) -> str | None:
    parts: list[str] = []
    if sections:
        parts.append(
            "Organize the summary to cover these sections in order: " + ", ".join(sections) + "."
        )
    if scaffold:
        parts.append(scaffold.strip())
    return " ".join(parts) if parts else None


async def resolve_template_directive(
    session: AsyncSession, ctx: OrgContext, template_id: str | None
) -> str | None:
    """Map a template id (built-in slug or custom uuid) to a summarize prompt directive."""
    if not template_id or template_id == FREEFORM_TEMPLATE_ID:
        return None
    builtin = BUILTIN_TEMPLATE_SECTIONS.get(template_id)
    if builtin is not None:
        return _directive(builtin, None)
    try:
        template_uuid = uuid.UUID(template_id)
    except ValueError:
        return None
    template = await session.scalar(
        select(MeetingTemplate).where(
            MeetingTemplate.id == template_uuid, MeetingTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        return None
    return _directive(template.sections, template.prompt_scaffold)


async def list_templates(session: AsyncSession, ctx: OrgContext) -> list[MeetingTemplate]:
    """List the org's custom templates."""
    result = await session.scalars(
        select(MeetingTemplate)
        .where(MeetingTemplate.org_id == ctx.org.id)
        .order_by(MeetingTemplate.name)
    )
    return list(result)


async def _get_template(
    session: AsyncSession, ctx: OrgContext, template_id: uuid.UUID
) -> MeetingTemplate:
    template = await session.scalar(
        select(MeetingTemplate).where(
            MeetingTemplate.id == template_id, MeetingTemplate.org_id == ctx.org.id
        )
    )
    if template is None:
        raise NotFoundError("Meeting template not found")
    return template


async def create_template(
    session: AsyncSession, ctx: OrgContext, payload: MeetingTemplateIn
) -> MeetingTemplate:
    """Create a custom meeting template (admin-gated at the router)."""
    clash = await session.scalar(
        select(MeetingTemplate.id).where(
            MeetingTemplate.org_id == ctx.org.id, MeetingTemplate.name == payload.name
        )
    )
    if clash is not None:
        raise ConflictError("A template with this name already exists")
    template = MeetingTemplate(
        org_id=ctx.org.id,
        name=payload.name,
        sections=payload.sections,
        prompt_scaffold=payload.prompt_scaffold,
        created_by=ctx.user.id,
    )
    session.add(template)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting_template",
        entity_id=template.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": template.name},
    )
    return template


async def update_template(
    session: AsyncSession,
    ctx: OrgContext,
    template_id: uuid.UUID,
    payload: MeetingTemplateUpdateIn,
) -> MeetingTemplate:
    """Apply provided fields to a custom template (admin-gated at the router)."""
    template = await _get_template(session, ctx, template_id)
    fields = payload.model_fields_set
    if "name" in fields and payload.name is not None:
        template.name = payload.name
    if "sections" in fields and payload.sections is not None:
        template.sections = payload.sections
    if "prompt_scaffold" in fields:
        template.prompt_scaffold = payload.prompt_scaffold
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting_template",
        entity_id=template.id,
        event_type="updated",
        actor_id=ctx.user.id,
        payload={"name": template.name},
    )
    await session.flush()
    return template


async def delete_template(session: AsyncSession, ctx: OrgContext, template_id: uuid.UUID) -> None:
    """Delete a custom template (admin-gated at the router)."""
    template = await _get_template(session, ctx, template_id)
    await session.delete(template)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting_template",
        entity_id=template_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": template.name},
    )
    await session.flush()


async def list_recipes(session: AsyncSession, ctx: OrgContext) -> list[MeetingRecipe]:
    """List the org's custom recipes."""
    result = await session.scalars(
        select(MeetingRecipe).where(MeetingRecipe.org_id == ctx.org.id).order_by(MeetingRecipe.name)
    )
    return list(result)


async def create_recipe(
    session: AsyncSession, ctx: OrgContext, payload: MeetingRecipeIn
) -> MeetingRecipe:
    """Save a custom recipe for the org."""
    clash = await session.scalar(
        select(MeetingRecipe.id).where(
            MeetingRecipe.org_id == ctx.org.id, MeetingRecipe.name == payload.name
        )
    )
    if clash is not None:
        raise ConflictError("A recipe with this name already exists")
    recipe = MeetingRecipe(
        org_id=ctx.org.id, name=payload.name, prompt=payload.prompt, created_by=ctx.user.id
    )
    session.add(recipe)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="meeting_recipe",
        entity_id=recipe.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": recipe.name},
    )
    return recipe
