"""Embed unfurl + persisted note embeds (COS-149)."""

import re
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError
from elliptic.modules.embeds.models import NoteEmbed
from elliptic.modules.embeds.providers import match_provider
from elliptic.modules.embeds.schemas import EmbedMeta
from elliptic.modules.notes.models import Note

_OG_TITLE = re.compile(
    r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', re.I
)
_OG_DESC = re.compile(
    r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', re.I
)
_OG_IMAGE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I
)
_TITLE = re.compile(r"<title[^>]*>([^<]+)</title>", re.I)


async def unfurl(session: AsyncSession, url: str) -> EmbedMeta:
    """Resolve link/iframe metadata for a URL. Outbound fetch is air-gap gated (COS-149/216)."""
    if not url.startswith(("http://", "https://")):
        raise BadRequestError("Only http(s) URLs can be embedded")
    provider = match_provider(url)
    meta = EmbedMeta(
        url=url,
        provider=provider.provider if provider else "link",
        kind=provider.kind if provider else "link",
        iframe_url=provider.iframe_url if provider else None,
    )

    from elliptic.modules.instance.service import air_gapped_enabled  # noqa: PLC0415

    if meta.kind == "iframe" or await air_gapped_enabled(session):
        return meta

    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as http:
            resp = await http.get(url, headers={"User-Agent": "Elliptic-Unfurl/1.0"})
            html = resp.text[:200_000]
    except Exception:
        return meta

    title = _OG_TITLE.search(html) or _TITLE.search(html)
    desc = _OG_DESC.search(html)
    image = _OG_IMAGE.search(html)
    meta.title = title.group(1).strip()[:500] if title else None
    meta.description = desc.group(1).strip()[:1000] if desc else None
    meta.thumbnail_url = image.group(1).strip()[:2000] if image else None
    return meta


async def _note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> Note:
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == ctx.org.id))
    if note is None:
        raise NotFoundError("Note not found")
    return note


async def list_embeds(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID
) -> list[NoteEmbed]:
    await _note(session, ctx, note_id)
    result = await session.scalars(
        select(NoteEmbed)
        .where(NoteEmbed.note_id == note_id, NoteEmbed.org_id == ctx.org.id)
        .order_by(NoteEmbed.created_at)
    )
    return list(result)


async def create_embed(
    session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID, url: str
) -> NoteEmbed:
    await _note(session, ctx, note_id)
    meta = await unfurl(session, url)
    embed = NoteEmbed(
        org_id=ctx.org.id,
        note_id=note_id,
        url=meta.url,
        provider=meta.provider,
        kind=meta.kind,
        title=meta.title,
        description=meta.description,
        thumbnail_url=meta.thumbnail_url,
        iframe_url=meta.iframe_url,
        created_by=ctx.user.id,
    )
    session.add(embed)
    await session.flush()
    return embed


async def delete_embed(session: AsyncSession, ctx: OrgContext, embed_id: uuid.UUID) -> None:
    embed = await session.scalar(
        select(NoteEmbed).where(NoteEmbed.id == embed_id, NoteEmbed.org_id == ctx.org.id)
    )
    if embed is None:
        raise NotFoundError("Embed not found")
    await session.delete(embed)
    await session.flush()
