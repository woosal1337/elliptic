"""Publish a page to a public web link with anonymous comments (COS-124)."""

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.notes.export import markdown_to_html
from elliptic.modules.notes.models import Note, PublicPageComment


async def _owned_note(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> Note:
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == ctx.org.id))
    if note is None:
        raise NotFoundError("Page not found")
    return note


async def publish(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> Note:
    note = await _owned_note(session, ctx, note_id)
    if note.public_token is None:
        note.public_token = secrets.token_urlsafe(24)
        await session.flush()
    return note


async def unpublish(session: AsyncSession, ctx: OrgContext, note_id: uuid.UUID) -> None:
    note = await _owned_note(session, ctx, note_id)
    note.public_token = None
    await session.flush()


async def _public_note(session: AsyncSession, token: str) -> Note:
    note = await session.scalar(select(Note).where(Note.public_token == token))
    if note is None or note.archived_at is not None:
        raise NotFoundError("Published page not found")
    return note


async def read_public(session: AsyncSession, token: str) -> dict[str, object]:
    note = await _public_note(session, token)
    comments = list(
        await session.scalars(
            select(PublicPageComment)
            .where(PublicPageComment.note_id == note.id, PublicPageComment.reported.is_(False))
            .order_by(PublicPageComment.created_at)
        )
    )
    return {
        "title": note.title,
        "icon": note.icon,
        "content_html": markdown_to_html(note.content),
        "comments": [
            {"id": c.id, "author_name": c.author_name, "body": c.body, "created_at": c.created_at}
            for c in comments
        ],
    }


async def add_public_comment(
    session: AsyncSession, token: str, author_name: str, body: str
) -> PublicPageComment:
    note = await _public_note(session, token)
    comment = PublicPageComment(
        note_id=note.id, author_name=author_name.strip()[:120] or "Anonymous", body=body.strip()
    )
    session.add(comment)
    await session.flush()
    return comment


async def report_public_comment(session: AsyncSession, token: str, comment_id: uuid.UUID) -> None:
    note = await _public_note(session, token)
    comment = await session.scalar(
        select(PublicPageComment).where(
            PublicPageComment.id == comment_id, PublicPageComment.note_id == note.id
        )
    )
    if comment is None:
        raise NotFoundError("Comment not found")
    comment.reported = True
    await session.flush()
