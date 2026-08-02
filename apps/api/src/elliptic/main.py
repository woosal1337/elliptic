"""Application factory, lifespan, and router registration."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

import elliptic.core.models_registry  # noqa: F401
from elliptic.core.config import get_settings
from elliptic.core.database import engine
from elliptic.core.handlers import register_handlers
from elliptic.core.logging import setup_logging
from elliptic.core.ratelimit import limiter
from elliptic.core.realtime import listener
from elliptic.core.scheduler import start_scheduler, stop_scheduler
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.activity.router import router as activity_router
from elliptic.modules.activity.stream import router as stream_router
from elliptic.modules.ai.router import router as ai_router
from elliptic.modules.analytics.router import router as analytics_router
from elliptic.modules.approvals.router import router as approvals_router
from elliptic.modules.audit.router import router as audit_router
from elliptic.modules.auth.router import router as auth_router
from elliptic.modules.auth_providers.router import admin_router as auth_providers_admin_router
from elliptic.modules.auth_providers.router import public_router as auth_providers_public_router
from elliptic.modules.automation.router import router as automation_router
from elliptic.modules.coediting.router import router as coediting_router
from elliptic.modules.comments.router import router as comments_router
from elliptic.modules.compliance.router import router as compliance_router
from elliptic.modules.config.router import router as config_router
from elliptic.modules.customers.router import router as customers_router
from elliptic.modules.cycles.router import org_router as cycles_org_router
from elliptic.modules.cycles.router import router as cycles_router
from elliptic.modules.dashboards.router import router as dashboards_router
from elliptic.modules.domains.router import router as domains_router
from elliptic.modules.embeds.router import router as embeds_router
from elliptic.modules.events.router import router as events_router
from elliptic.modules.favorites.router import router as favorites_router
from elliptic.modules.idp_sync.router import router as idp_sync_router
from elliptic.modules.initiatives.router import router as initiatives_router
from elliptic.modules.instance.router import router as instance_router
from elliptic.modules.intake.forms_router import public_router as public_intake_forms_router
from elliptic.modules.intake.forms_router import router as intake_forms_router
from elliptic.modules.intake.public_router import router as public_intake_router
from elliptic.modules.intake.router import router as intake_router
from elliptic.modules.integrations.email_router import public_router as public_email_router
from elliptic.modules.integrations.email_router import router as email_router
from elliptic.modules.integrations.git_router import public_router as public_git_router
from elliptic.modules.integrations.git_router import router as git_router
from elliptic.modules.integrations.router import router as integrations_router
from elliptic.modules.integrations.sentry_router import public_router as public_sentry_router
from elliptic.modules.integrations.sentry_router import router as sentry_router
from elliptic.modules.integrations.slack_command_router import admin_router as slack_admin_router
from elliptic.modules.integrations.slack_command_router import (
    public_router as slack_command_router,
)
from elliptic.modules.ldap.router import admin_router as ldap_admin_router
from elliptic.modules.ldap.router import public_router as ldap_public_router
from elliptic.modules.marketplace.router import router as marketplace_router
from elliptic.modules.mcp_auth.router import router as mcp_auth_router
from elliptic.modules.mcp_auth.well_known import router as well_known_router
from elliptic.modules.mcp_connectors.router import router as mcp_connectors_router
from elliptic.modules.mcp_server.app import build_mcp_app
from elliptic.modules.meeting_templates.router import router as meeting_templates_router
from elliptic.modules.meetings.public_router import router as public_share_router
from elliptic.modules.meetings.router import router as meetings_router
from elliptic.modules.milestones.router import router as milestones_router
from elliptic.modules.modules.router import router as modules_router
from elliptic.modules.notes.public_router import public_router as public_pages_router
from elliptic.modules.notes.public_router import publish_router as notes_publish_router
from elliptic.modules.notes.router import router as notes_router
from elliptic.modules.notes.templates_router import router as note_templates_router
from elliptic.modules.notifications.router import router as notifications_router
from elliptic.modules.ops.router import router as ops_router
from elliptic.modules.orgs.roles_router import router as roles_router
from elliptic.modules.orgs.router import router as orgs_router
from elliptic.modules.outbox.router import router as outbox_router
from elliptic.modules.pql.router import router as pql_router
from elliptic.modules.projects.public_board_router import public_router as public_boards_router
from elliptic.modules.projects.public_board_router import publish_router as board_publish_router
from elliptic.modules.projects.router import router as projects_router
from elliptic.modules.projects.states_router import router as project_states_router
from elliptic.modules.projects.templates_router import router as project_templates_router
from elliptic.modules.properties.router import router as properties_router
from elliptic.modules.properties.router import templates_router as property_templates_lib_router
from elliptic.modules.rbac_audit.router import router as rbac_audit_router
from elliptic.modules.recurring.router import router as recurring_router
from elliptic.modules.register.router import router as register_router
from elliptic.modules.releases.router import router as releases_router
from elliptic.modules.resolve.router import router as resolve_router
from elliptic.modules.retrospectives.router import router as retrospectives_router
from elliptic.modules.runner.router import router as runner_router
from elliptic.modules.scim.router import admin_router as scim_admin_router
from elliptic.modules.scim.router import scim_router
from elliptic.modules.search.router import router as search_router
from elliptic.modules.sso.router import admin_router as sso_admin_router
from elliptic.modules.sso.router import public_router as sso_public_router
from elliptic.modules.stickies.router import router as stickies_router
from elliptic.modules.storage.router import router as storage_router
from elliptic.modules.sync.router import router as sync_router
from elliptic.modules.tasks.router import router as tasks_router
from elliptic.modules.tasks.type_levels_router import router as type_levels_router
from elliptic.modules.teams.router import router as teams_router
from elliptic.modules.users.router import router as users_router
from elliptic.modules.views.public_router import public_router as public_views_router
from elliptic.modules.views.public_router import publish_router as views_publish_router
from elliptic.modules.views.router import router as views_router
from elliptic.modules.vocabulary.router import router as vocabulary_router
from elliptic.modules.webhooks.router import router as webhooks_router
from elliptic.modules.workflow.router import router as workflow_router
from elliptic.modules.worklogs.router import router as worklogs_router

mcp_app = build_mcp_app()


class MCPAuthChallengeMiddleware:
    """Return an RFC 9728 Bearer challenge for unauthenticated MCP requests so OAuth
    clients (Claude Code, etc.) discover the authorization server and start the flow.
    Per-request token validation still happens inside each tool's mcp_call."""

    def __init__(self, app: ASGIApp, metadata_url: str) -> None:
        self.app = app
        self.metadata_url = metadata_url

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope.get("path", "").startswith("/api/v1/mcp"):
            if scope["path"] == "/api/v1/mcp":
                scope["path"] = "/api/v1/mcp/"
                scope["raw_path"] = b"/api/v1/mcp/"
            headers = Headers(scope=scope)
            authorization = headers.get("authorization", "")
            has_api_key = bool(headers.get("x-api-key", "").strip())
            if not authorization.lower().startswith("bearer ") and not has_api_key:
                response = JSONResponse(
                    {"error": "unauthorized", "error_description": "Authentication required"},
                    status_code=401,
                    headers={"WWW-Authenticate": f'Bearer resource_metadata="{self.metadata_url}"'},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


async def _bootstrap_instance_admins() -> None:
    """Promote allowlisted emails to instance admins on startup (COS-223)."""
    emails = [
        e.strip().lower() for e in get_settings().instance_admin_emails.split(",") if e.strip()
    ]
    if not emails:
        return
    from sqlalchemy import update  # noqa: PLC0415

    from elliptic.core.database import session_factory  # noqa: PLC0415
    from elliptic.modules.users.models import User  # noqa: PLC0415

    async with session_factory() as session:
        await session.execute(
            update(User).where(User.email.in_(emails)).values(is_instance_admin=True)
        )
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Verify database connectivity, run scheduled jobs, the MCP server, and the listener."""
    setup_logging()
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    logger.info("Database connection verified")
    scheduled = get_settings().env != "test"
    if scheduled:
        start_scheduler()
    await _bootstrap_instance_admins()
    await listener.start()
    from elliptic.core.realtime import register_event_handler  # noqa: PLC0415
    from elliptic.modules.webhooks import service as webhooks_service  # noqa: PLC0415

    register_event_handler(webhooks_service.dispatch_event)
    from elliptic.modules.coediting.service import run_server  # noqa: PLC0415

    async with run_server(), mcp_app.lifespan(app):
        yield
    await listener.stop()
    if scheduled:
        await stop_scheduler()
    await engine.dispose()


def create_app() -> FastAPI:  # noqa: PLR0915 — flat router registration list
    """Build the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title="Elliptic API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs",
        openapi_url="/api/v1/openapi.json",
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(
        MCPAuthChallengeMiddleware,
        metadata_url=f"{settings.oauth_issuer}/.well-known/oauth-protected-resource/api/v1/mcp",
    )
    register_handlers(app)

    api = APIRouter(prefix="/api/v1")

    @api.get("/health", tags=["health"])
    async def health() -> SuccessResponse[dict[str, str]]:
        return ok({"status": "ok", "env": settings.env}, message="healthy")

    api.include_router(ops_router)
    api.include_router(auth_router)
    api.include_router(auth_providers_admin_router)
    api.include_router(auth_providers_public_router)
    api.include_router(users_router)
    api.include_router(orgs_router)
    api.include_router(roles_router)
    api.include_router(teams_router)
    api.include_router(projects_router)
    api.include_router(board_publish_router)
    api.include_router(public_boards_router)
    api.include_router(pql_router)
    api.include_router(project_templates_router)
    api.include_router(project_states_router)
    api.include_router(search_router)
    api.include_router(storage_router)
    api.include_router(tasks_router)
    api.include_router(type_levels_router)
    api.include_router(approvals_router)
    api.include_router(cycles_router)
    api.include_router(outbox_router)
    api.include_router(resolve_router)
    api.include_router(cycles_org_router)
    api.include_router(favorites_router)
    api.include_router(sync_router)
    api.include_router(idp_sync_router)
    api.include_router(instance_router)
    api.include_router(initiatives_router)
    api.include_router(milestones_router)
    api.include_router(modules_router)
    api.include_router(worklogs_router)
    api.include_router(releases_router)
    api.include_router(runner_router)
    api.include_router(intake_router)
    api.include_router(public_intake_router)
    api.include_router(intake_forms_router)
    api.include_router(recurring_router)
    api.include_router(retrospectives_router)
    api.include_router(customers_router)
    api.include_router(dashboards_router)
    api.include_router(public_intake_forms_router)
    api.include_router(properties_router)
    api.include_router(property_templates_lib_router)
    api.include_router(ldap_admin_router)
    api.include_router(ldap_public_router)
    api.include_router(scim_admin_router)
    api.include_router(scim_router)
    api.include_router(sso_admin_router)
    api.include_router(sso_public_router)
    api.include_router(stickies_router)
    api.include_router(meetings_router)
    api.include_router(embeds_router)
    api.include_router(notes_router)
    api.include_router(notes_publish_router)
    api.include_router(public_pages_router)
    api.include_router(note_templates_router)
    api.include_router(events_router)
    api.include_router(comments_router)
    api.include_router(coediting_router)
    api.include_router(config_router)
    api.include_router(compliance_router)
    api.include_router(notifications_router)
    api.include_router(activity_router)
    api.include_router(audit_router)
    api.include_router(rbac_audit_router)
    api.include_router(register_router)
    api.include_router(analytics_router)
    api.include_router(stream_router)
    api.include_router(mcp_connectors_router)
    api.include_router(mcp_auth_router)
    api.include_router(ai_router)
    api.include_router(vocabulary_router)
    api.include_router(domains_router)
    api.include_router(integrations_router)
    api.include_router(sentry_router)
    api.include_router(public_sentry_router)
    api.include_router(email_router)
    api.include_router(public_email_router)
    api.include_router(git_router)
    api.include_router(public_git_router)
    api.include_router(slack_command_router)
    api.include_router(slack_admin_router)
    api.include_router(workflow_router)
    api.include_router(marketplace_router)
    api.include_router(meeting_templates_router)
    api.include_router(public_share_router)
    api.include_router(automation_router)
    api.include_router(views_router)
    api.include_router(views_publish_router)
    api.include_router(public_views_router)
    api.include_router(webhooks_router)
    app.include_router(api)
    app.include_router(well_known_router)
    app.mount("/api/v1/mcp", mcp_app)
    return app


app = create_app()
