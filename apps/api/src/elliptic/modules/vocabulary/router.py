"""Vocabulary endpoints. Reads are member-level; writes require admin."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.vocabulary import service
from elliptic.modules.vocabulary.schemas import (
    VocabularyCreateIn,
    VocabularyOut,
    VocabularyUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/vocabulary", tags=["vocabulary"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.get("")
async def list_terms(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[VocabularyOut]]:
    terms = await service.list_terms(session, ctx)
    return ok([VocabularyOut.model_validate(term) for term in terms])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_term(
    payload: VocabularyCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[VocabularyOut]:
    term = await service.create_term(session, ctx, payload)
    return ok(VocabularyOut.model_validate(term), message="Term added")


@router.patch("/{term_id}")
async def update_term(
    term_id: uuid.UUID, payload: VocabularyUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[VocabularyOut]:
    term = await service.update_term(session, ctx, term_id, payload)
    return ok(VocabularyOut.model_validate(term), message="Term updated")


@router.delete("/{term_id}")
async def delete_term(
    term_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_term(session, ctx, term_id)
    return ok(None, message="Term deleted")
