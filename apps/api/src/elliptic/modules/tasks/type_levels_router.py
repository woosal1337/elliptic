"""Work-item type hierarchy endpoints (COS-71)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.tasks import type_levels
from elliptic.modules.tasks.models import TaskKind

router = APIRouter(prefix="/orgs/{org_id}/work-item-type-levels", tags=["work-item-types"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


class TypeLevelOut(BaseModel):
    """A work-item type's hierarchy level."""

    model_config = ConfigDict(from_attributes=True)

    kind: TaskKind
    level: int


class TypeLevelIn(BaseModel):
    """Set the hierarchy level for a work-item type."""

    kind: TaskKind
    level: int = Field(ge=1, le=10)


class TypeLevelsIn(BaseModel):
    """Bulk update of work-item type levels."""

    levels: list[TypeLevelIn]


@router.get("")
async def list_type_levels(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[TypeLevelOut]]:
    levels = await type_levels.list_type_levels(session, ctx)
    return ok([TypeLevelOut.model_validate(level) for level in levels])


@router.put("")
async def set_type_levels(
    payload: TypeLevelsIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[list[TypeLevelOut]]:
    updated = await type_levels.set_type_levels(
        session, ctx, {entry.kind: entry.level for entry in payload.levels}
    )
    return ok([TypeLevelOut.model_validate(level) for level in updated], message="Levels updated")
