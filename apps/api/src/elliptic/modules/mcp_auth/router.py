"""OAuth 2.1 authorization-server HTTP endpoints for the CompanyOS MCP."""

import uuid
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Form, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from elliptic.core.config import get_settings
from elliptic.core.deps import CurrentUser, SessionDep
from elliptic.core.exceptions import BadRequestError, ForbiddenError
from elliptic.core.ratelimit import limiter
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.mcp_auth import apps_service, service
from elliptic.modules.mcp_auth import scopes as scope_catalog
from elliptic.modules.mcp_auth.models import ClientRegistrationType, OAuthClient
from elliptic.modules.mcp_auth.schemas import (
    AppCreateIn,
    AppCreateOut,
    AppOut,
    ConsentContext,
    ConsentOrg,
    ConsentScope,
    DecisionRequest,
    DecisionResponse,
    GrantOut,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from elliptic.modules.mcp_auth.tokens import build_jwks
from elliptic.modules.orgs.models import Organization, OrganizationMember

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def register(
    request: Request,  # noqa: ARG001
    body: RegisterRequest,
    session: SessionDep,
) -> RegisterResponse:
    """Register a public PKCE client (RFC 7591)."""
    client = await service.register_client(
        session,
        client_name=body.client_name,
        redirect_uris=body.redirect_uris,
        grant_types=body.grant_types,
    )
    return RegisterResponse(
        client_id=client.client_id,
        client_name=client.client_name,
        redirect_uris=client.redirect_uris,
        grant_types=client.grant_types,
        token_endpoint_auth_method=client.token_endpoint_auth_method,
    )


@router.get("/authorize")
async def authorize(
    session: SessionDep,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    resource: str | None = None,
    response_type: str = "code",
    code_challenge_method: str = "S256",
    scope: str | None = None,
    state: str | None = None,
) -> RedirectResponse:
    """Validate the request and redirect to the frontend consent page with a signed
    request id. This endpoint is public: it carries no user identity (the browser's
    CompanyOS session lives on the web app's domain, not the API's). The consent page
    enforces login, and the user is established at the /consent and /decision steps,
    which the frontend calls through its own origin with the session cookie.

    ``resource`` is optional for compatibility with OAuth clients that predate
    RFC 8707 resource indicators; when omitted it defaults to the canonical MCP
    resource URI this server advertises in its own metadata."""
    if response_type != "code":
        raise BadRequestError("Only response_type=code is supported")
    await service.validate_authorize_request(
        session,
        client_id=client_id,
        redirect_uri=redirect_uri,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
    )
    request_id = service.sign_authorization_request(
        client_id=client_id,
        redirect_uri=redirect_uri,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        scope=service.normalize_requested_scopes(scope),
        resource=service.resolve_resource(resource),
        state=state,
    )
    consent_url = f"{get_settings().app_base_url}/authorize?{urlencode({'request_id': request_id})}"
    return RedirectResponse(consent_url, status_code=status.HTTP_302_FOUND)


@router.get("/consent")
async def consent(
    user: CurrentUser, session: SessionDep, request_id: str
) -> SuccessResponse[ConsentContext]:
    """Return the consent context (client, orgs, scopes) for the signed request."""
    request = service.decode_authorization_request(request_id)
    client = await session.scalar(
        select(OAuthClient).where(OAuthClient.client_id == request["client_id"])
    )
    if client is None:
        raise BadRequestError("Unknown client")
    rows = (
        await session.execute(
            select(Organization, OrganizationMember)
            .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
            .where(OrganizationMember.user_id == user.id)
        )
    ).all()
    requested = set(request.get("scope", []))
    context = ConsentContext(
        request_id=request_id,
        client_name=client.client_name,
        client_unverified=client.registration_type == ClientRegistrationType.DCR,
        orgs=[ConsentOrg(id=str(org.id), name=org.name, role=member.role) for org, member in rows],
        can_grant_all_orgs=len(rows) > 0,
        scopes=[
            ConsentScope(
                scope=definition.scope,
                domain=definition.domain,
                label=definition.label,
                elevated=definition.elevated,
                baseline=definition.baseline,
                requested=definition.scope in requested,
            )
            for definition in scope_catalog.SCOPE_CATALOG
        ],
    )
    return ok(context)


def _reject_cross_origin(http_request: Request) -> None:
    origin = http_request.headers.get("origin")
    if origin is None:
        return
    settings = get_settings()
    allowed = {settings.app_base_url, *settings.cors_origin_list}
    if origin not in allowed:
        raise ForbiddenError("Cross-origin request rejected")


@router.post("/authorize/decision")
async def decision(
    http_request: Request, user: CurrentUser, session: SessionDep, body: DecisionRequest
) -> SuccessResponse[DecisionResponse]:
    """Record the consent decision and return the client redirect with a code."""
    _reject_cross_origin(http_request)
    request = service.decode_authorization_request(body.request_id)
    if body.decision != "allow":
        params = {"error": "access_denied", "state": request.get("state") or ""}
        return ok(DecisionResponse(redirect_to=f"{request['redirect_uri']}?{urlencode(params)}"))
    granted = scope_catalog.resolve_granted_scopes(body.scopes, request.get("scope", []))
    if not granted:
        raise BadRequestError("No valid scopes granted")
    if body.all_orgs:
        has_membership = await session.scalar(
            select(OrganizationMember.id).where(OrganizationMember.user_id == user.id).limit(1)
        )
        if has_membership is None:
            raise ForbiddenError("You do not belong to any organization")
        code = await service.issue_authorization_code(
            session, request=request, user_id=user.id, org_id=None, scopes=granted
        )
    else:
        if not body.org_id:
            raise BadRequestError("org_id is required unless all_orgs is set")
        org_id = uuid.UUID(body.org_id)
        membership = await session.scalar(
            select(OrganizationMember).where(
                OrganizationMember.org_id == org_id, OrganizationMember.user_id == user.id
            )
        )
        if membership is None:
            raise ForbiddenError("Not a member of the selected organization")
        code = await service.issue_authorization_code(
            session, request=request, user_id=user.id, org_id=org_id, scopes=granted
        )
    params = {
        "code": code,
        "state": request.get("state") or "",
        "iss": get_settings().oauth_issuer,
    }
    return ok(DecisionResponse(redirect_to=f"{request['redirect_uri']}?{urlencode(params)}"))


@router.post("/token")
@limiter.limit("60/minute")
async def token(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    grant_type: Annotated[str, Form()],
    client_id: Annotated[str, Form()],
    code: Annotated[str | None, Form()] = None,
    code_verifier: Annotated[str | None, Form()] = None,
    redirect_uri: Annotated[str | None, Form()] = None,
    resource: Annotated[str | None, Form()] = None,
    refresh_token: Annotated[str | None, Form()] = None,
    client_secret: Annotated[str | None, Form()] = None,
) -> TokenResponse:
    """Exchange a code or rotate a refresh token (RFC 6749 / RFC 9700)."""
    if grant_type == "authorization_code":
        if not code or not code_verifier or not redirect_uri:
            raise BadRequestError("invalid_request")
        result = await service.exchange_code(
            session,
            code=code,
            code_verifier=code_verifier,
            redirect_uri=redirect_uri,
            client_id=client_id,
            resource=resource,
        )
    elif grant_type == "refresh_token":
        if not refresh_token:
            raise BadRequestError("invalid_request")
        result = await service.refresh_tokens(
            session, refresh_token=refresh_token, client_id=client_id
        )
    elif grant_type == "client_credentials":
        if not client_secret:
            raise BadRequestError("invalid_request")
        bot_token = await apps_service.client_credentials_token(
            session, client_id=client_id, client_secret=client_secret
        )
        return TokenResponse(
            access_token=bot_token,
            token_type="Bearer",  # noqa: S106
            expires_in=0,
            refresh_token=None,
            scope=None,
        )
    else:
        raise BadRequestError("unsupported_grant_type")
    return TokenResponse(
        access_token=result.access_token,
        token_type="Bearer",  # noqa: S106
        expires_in=result.expires_in,
        refresh_token=result.refresh_token,
        scope=result.scope,
    )


@router.post("/revoke", status_code=status.HTTP_200_OK)
async def revoke(session: SessionDep, token: Annotated[str, Form()]) -> Response:
    """Revoke a token and its grant family (RFC 7009)."""
    await service.revoke_token(session, token=token)
    return Response(status_code=status.HTTP_200_OK)


@router.get("/jwks.json")
async def jwks(session: SessionDep) -> dict[str, list[dict[str, str]]]:
    """Publish the public JWKS used to verify MCP access tokens."""
    return await build_jwks(session)


@router.get("/grants")
async def list_grants(user: CurrentUser, session: SessionDep) -> SuccessResponse[list[GrantOut]]:
    """List the caller's connected AI clients across their organizations."""
    rows = await service.list_grants(session, user_id=user.id)
    return ok(
        [
            GrantOut(
                grant_id=str(grant.id),
                client_name=client.client_name if client else "Unknown app",
                org_id=str(org.id) if org else "",
                org_name=org.name if org else "All your organizations",
                scopes=grant.scopes,
                status=grant.status,
                created_at=grant.created_at,
            )
            for grant, client, org in rows
        ]
    )


@router.delete("/grants/{grant_id}")
async def revoke_grant(
    grant_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SuccessResponse[None]:
    """Revoke a connected AI client (and all its tokens)."""
    await service.revoke_grant(session, grant_id=grant_id, user_id=user.id)
    return ok(None, message="Access revoked")


@router.post("/apps", status_code=status.HTTP_201_CREATED)
async def create_app(
    body: AppCreateIn, user: CurrentUser, session: SessionDep
) -> SuccessResponse[AppCreateOut]:
    """Register a confidential client_credentials app and return its one-time secret (COS-198)."""
    app, secret = await apps_service.create_app(session, user, body.name)
    return ok(
        AppCreateOut(client_id=app.client_id, client_secret=secret, client_name=app.client_name),
        message="App created",
    )


@router.get("/apps")
async def list_apps(user: CurrentUser, session: SessionDep) -> SuccessResponse[list[AppOut]]:
    apps = await apps_service.list_apps(session, user)
    return ok(
        [
            AppOut(client_id=a.client_id, client_name=a.client_name, created_at=a.created_at)
            for a in apps
        ]
    )


@router.delete("/apps/{client_id}")
async def revoke_app(
    client_id: str, user: CurrentUser, session: SessionDep
) -> SuccessResponse[None]:
    await apps_service.revoke_app(session, user, client_id)
    return ok(None, message="App revoked")
