"""PQL endpoints (COS-154)."""

from fastapi import APIRouter

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.pql import service
from elliptic.modules.pql.parser import PqlError
from elliptic.modules.pql.schemas import (
    PqlExecuteIn,
    PqlFromTextIn,
    PqlFromTextOut,
    PqlResultOut,
    PqlTaskOut,
    PqlValidateIn,
    PqlValidateOut,
)

router = APIRouter(prefix="/orgs/{org_id}/pql", tags=["pql"])


@router.post("/validate")
async def validate_query(payload: PqlValidateIn) -> SuccessResponse[PqlValidateOut]:
    """Check whether a PQL query parses and references known fields/functions."""
    try:
        service.validate_query(payload.query)
    except PqlError as exc:
        return ok(PqlValidateOut(valid=False, error=str(exc)))
    return ok(PqlValidateOut(valid=True))


@router.post("/execute")
async def execute_query(
    payload: PqlExecuteIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PqlResultOut]:
    """Run a PQL query over the org's tasks and return matching work items."""
    try:
        rows = await service.execute_query(
            session, ctx, payload.query, project_id=payload.project_id
        )
    except PqlError as exc:
        from elliptic.core.exceptions import BadRequestError  # noqa: PLC0415

        raise BadRequestError(f"Invalid PQL: {exc}") from exc
    results = [PqlTaskOut.model_validate(r) for r in rows]
    return ok(PqlResultOut(query=payload.query, count=len(results), results=results))


@router.post("/from-text")
async def from_text(
    payload: PqlFromTextIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[PqlFromTextOut]:
    """Translate natural language into PQL via the LLM, then run it (COS-163)."""
    query = await service.generate_query(session, ctx, payload.prompt)
    rows = await service.execute_query(session, ctx, query)
    results = [PqlTaskOut.model_validate(r) for r in rows]
    return ok(
        PqlFromTextOut(prompt=payload.prompt, query=query, count=len(results), results=results)
    )
