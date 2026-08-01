"""Vocabulary business logic and AI prompt glossary assembly."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import ConflictError, NotFoundError
from elliptic.modules.activity.service import record_activity
from elliptic.modules.vocabulary.models import VocabularyTerm
from elliptic.modules.vocabulary.schemas import VocabularyCreateIn, VocabularyUpdateIn

GLOSSARY_LIMIT = 200


async def list_terms(session: AsyncSession, ctx: OrgContext) -> list[VocabularyTerm]:
    """List the org's vocabulary terms alphabetically."""
    result = await session.scalars(
        select(VocabularyTerm)
        .where(VocabularyTerm.org_id == ctx.org.id)
        .order_by(VocabularyTerm.term)
    )
    return list(result)


async def create_term(
    session: AsyncSession, ctx: OrgContext, payload: VocabularyCreateIn
) -> VocabularyTerm:
    """Add a vocabulary term, unique per org."""
    existing = await session.scalar(
        select(VocabularyTerm).where(
            VocabularyTerm.org_id == ctx.org.id, VocabularyTerm.term == payload.term
        )
    )
    if existing is not None:
        raise ConflictError("This term already exists")
    term = VocabularyTerm(org_id=ctx.org.id, term=payload.term, definition=payload.definition)
    session.add(term)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="vocabulary",
        entity_id=term.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"term": term.term},
    )
    return term


async def update_term(
    session: AsyncSession, ctx: OrgContext, term_id: uuid.UUID, payload: VocabularyUpdateIn
) -> VocabularyTerm:
    """Update a vocabulary term."""
    term = await _get_term(session, ctx, term_id)
    if payload.term is not None and payload.term != term.term:
        clash = await session.scalar(
            select(VocabularyTerm).where(
                VocabularyTerm.org_id == ctx.org.id, VocabularyTerm.term == payload.term
            )
        )
        if clash is not None:
            raise ConflictError("This term already exists")
        term.term = payload.term
    if payload.definition is not None:
        term.definition = payload.definition
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="vocabulary",
        entity_id=term.id,
        event_type="updated",
        actor_id=ctx.user.id,
        payload={"term": term.term},
    )
    await session.flush()
    return term


async def delete_term(session: AsyncSession, ctx: OrgContext, term_id: uuid.UUID) -> None:
    """Delete a vocabulary term."""
    term = await _get_term(session, ctx, term_id)
    await session.delete(term)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="vocabulary",
        entity_id=term_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"term": term.term},
    )
    await session.flush()


async def _get_term(session: AsyncSession, ctx: OrgContext, term_id: uuid.UUID) -> VocabularyTerm:
    term = await session.scalar(
        select(VocabularyTerm).where(
            VocabularyTerm.id == term_id, VocabularyTerm.org_id == ctx.org.id
        )
    )
    if term is None:
        raise NotFoundError("Term not found")
    return term


async def glossary_prompt(session: AsyncSession, org_id: uuid.UUID) -> str | None:
    """Build a system-prompt glossary block from the org's vocabulary, or None if empty."""
    result = await session.scalars(
        select(VocabularyTerm)
        .where(VocabularyTerm.org_id == org_id)
        .order_by(VocabularyTerm.term)
        .limit(GLOSSARY_LIMIT)
    )
    terms = list(result)
    if not terms:
        return None
    lines = "\n".join(f"- {term.term}: {term.definition}" for term in terms)
    return (
        "Use this organization glossary. Spell these terms exactly as written and "
        "prefer them over similar-sounding alternatives:\n" + lines
    )
