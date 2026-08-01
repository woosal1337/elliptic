"""User profile endpoints."""

import uuid

from fastapi import APIRouter, status

from elliptic.core.deps import CurrentUser, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.auth.schemas import UserOut
from elliptic.modules.users import service
from elliptic.modules.users.schemas import (
    PersonalAccessTokenCreatedOut,
    PersonalAccessTokenCreateIn,
    PersonalAccessTokenOut,
    ProfileUpdateIn,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_profile(user: CurrentUser) -> SuccessResponse[UserOut]:
    return ok(UserOut.model_validate(user))


@router.patch("/me")
async def update_profile(
    payload: ProfileUpdateIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[UserOut]:
    updated = await service.update_profile(session, user, payload)
    return ok(UserOut.model_validate(updated), message="Profile updated")


@router.get("/me/tokens")
async def list_tokens(
    user: CurrentUser, session: SessionDep
) -> SuccessResponse[list[PersonalAccessTokenOut]]:
    tokens = await service.list_tokens(session, user)
    return ok([PersonalAccessTokenOut.model_validate(token) for token in tokens])


@router.post("/me/tokens", status_code=status.HTTP_201_CREATED)
async def create_token(
    payload: PersonalAccessTokenCreateIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[PersonalAccessTokenCreatedOut]:
    token, raw = await service.create_token(session, user, payload)
    out = PersonalAccessTokenCreatedOut(
        **PersonalAccessTokenOut.model_validate(token).model_dump(), token=raw
    )
    return ok(out, message="Token created — copy it now; it won't be shown again")


@router.post("/me/tokens/{token_id}/regenerate")
async def regenerate_token(
    token_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SuccessResponse[PersonalAccessTokenCreatedOut]:
    """Rotate a token's secret in place, invalidating the old value (COS-275)."""
    token, raw = await service.regenerate_token(session, user, token_id)
    out = PersonalAccessTokenCreatedOut(
        **PersonalAccessTokenOut.model_validate(token).model_dump(), token=raw
    )
    return ok(out, message="Token regenerated — copy it now; it won't be shown again")


@router.delete("/me/tokens/{token_id}")
async def revoke_token(
    token_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SuccessResponse[None]:
    await service.revoke_token(session, user, token_id)
    return ok(None, message="Token revoked")
