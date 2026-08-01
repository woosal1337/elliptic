"""Vocabulary term read/write tools."""

import uuid
from typing import Any

from mcp.types import ToolAnnotations

from elliptic.modules.mcp_server.idempotency import run_idempotent
from elliptic.modules.mcp_server.instance import mcp
from elliptic.modules.mcp_server.principal import mcp_call
from elliptic.modules.vocabulary import service as vocabulary_service
from elliptic.modules.vocabulary.schemas import (
    VocabularyCreateIn,
    VocabularyOut,
    VocabularyUpdateIn,
)


@mcp.tool
async def list_vocabulary() -> dict[str, Any]:
    """List the org's vocabulary terms alphabetically."""
    async with mcp_call("vocabulary:read") as call:
        terms = await vocabulary_service.list_terms(call.session, call.ctx)
        items = [VocabularyOut.model_validate(term).model_dump(mode="json") for term in terms]
        return {"total": len(items), "items": items}


@mcp.tool
async def create_term(
    term: str,
    definition: str,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Add a vocabulary term (unique per org; requires admin)."""
    async with mcp_call("vocabulary:write") as call:

        async def _produce() -> dict[str, Any]:
            payload = VocabularyCreateIn(term=term, definition=definition)
            created = await vocabulary_service.create_term(call.session, call.ctx, payload)
            return VocabularyOut.model_validate(created).model_dump(mode="json")

        return await run_idempotent(
            call.session,
            org_id=call.ctx.org.id,
            key=idempotency_key,
            tool="create_term",
            producer=_produce,
        )


@mcp.tool
async def update_term(
    term_id: str,
    term: str | None = None,
    definition: str | None = None,
) -> dict[str, Any]:
    """Update a vocabulary term's name or definition (requires admin)."""
    async with mcp_call("vocabulary:write") as call:
        payload = VocabularyUpdateIn(term=term, definition=definition)
        updated = await vocabulary_service.update_term(
            call.session, call.ctx, uuid.UUID(term_id), payload
        )
        return VocabularyOut.model_validate(updated).model_dump(mode="json")


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_term(term_id: str, confirm: bool = False) -> dict[str, Any]:
    """Delete a vocabulary term. Call with confirm=false to preview, then confirm=true to delete."""
    async with mcp_call("vocabulary:write") as call:
        target = next(
            (
                term
                for term in await vocabulary_service.list_terms(call.session, call.ctx)
                if str(term.id) == term_id
            ),
            None,
        )
        if target is None:
            return {"deleted": False, "term_id": term_id, "error": "Term not found"}
        if not confirm:
            return {
                "requires_confirmation": True,
                "action": "delete_term",
                "term_id": term_id,
                "term": target.term,
                "hint": "Re-call delete_term with confirm=true to permanently delete.",
            }
        await vocabulary_service.delete_term(call.session, call.ctx, uuid.UUID(term_id))
        return {"deleted": True, "term_id": term_id}
