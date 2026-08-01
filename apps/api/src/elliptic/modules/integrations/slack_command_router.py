"""Slack slash-command endpoints (COS-266)."""

import uuid
from typing import Annotated
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, Request

from elliptic.core.config import get_settings
from elliptic.core.deps import OrgContext, SessionDep, require_role
from elliptic.core.exceptions import UnauthorizedError
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.integrations import slack_commands
from elliptic.modules.orgs.models import OrgRole

public_router = APIRouter(prefix="/integrations/slack", tags=["public-integrations"])
admin_router = APIRouter(prefix="/orgs/{org_id}/integrations/slack", tags=["integrations"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@public_router.post("/commands")
async def slash_command(request: Request, session: SessionDep) -> dict[str, str]:
    """Handle a Slack /companyos slash command (form-encoded, signed).

    The raw body is read once and parsed manually so its exact bytes are available
    for HMAC signature verification (FastAPI Form parsing would consume the stream).
    """
    raw_body = (await request.body()).decode()
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    secret = get_settings().slack_signing_secret
    if not slack_commands.verify_slack_signature(secret, timestamp, raw_body, signature):
        raise UnauthorizedError("Invalid Slack signature")
    form = parse_qs(raw_body)
    team_id = form.get("team_id", [""])[0]
    text = form.get("text", [""])[0]
    return await slack_commands.handle_command(session, team_id=team_id, user_text=text)


@admin_router.put("/default-project")
async def set_default_project(
    payload: dict[str, str | None], ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    """Set the project that /companyos files work items into."""
    raw = payload.get("project_id")
    project_id = uuid.UUID(raw) if raw else None
    await slack_commands.set_default_project(session, ctx, project_id)
    return ok(None, message="Slack default project updated")
