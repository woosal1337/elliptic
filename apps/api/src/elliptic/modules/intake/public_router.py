"""Unauthenticated public intake-form endpoints (no-account submission)."""

from fastapi import APIRouter, Request

from elliptic.core.deps import SessionDep
from elliptic.core.ratelimit import limiter
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.intake import service
from elliptic.modules.intake.schemas import IntakeFormOut, IntakeSubmitIn, IntakeSubmitOut

router = APIRouter(prefix="/intake", tags=["public-intake"])


@router.get("/{token}")
async def get_intake_form(token: str, session: SessionDep) -> SuccessResponse[IntakeFormOut]:
    project_name, org_name = await service.get_intake_form(session, token)
    return ok(IntakeFormOut(project_name=project_name, org_name=org_name))


@router.post("/{token}")
@limiter.limit("10/minute")
async def submit_intake(
    request: Request,  # noqa: ARG001 — required by the rate limiter
    token: str,
    payload: IntakeSubmitIn,
    session: SessionDep,
) -> SuccessResponse[IntakeSubmitOut]:
    reference = await service.submit_intake(session, token, payload)
    return ok(IntakeSubmitOut(reference=reference), message="Submission received")
