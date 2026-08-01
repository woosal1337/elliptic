"""OAuth discovery endpoints (RFC 8414 + RFC 9728) served at the application root."""

from fastapi import APIRouter

from elliptic.core.config import get_settings
from elliptic.modules.mcp_auth import scopes as scope_catalog

router = APIRouter(tags=["oauth-discovery"])


@router.get("/.well-known/oauth-authorization-server")
async def authorization_server_metadata() -> dict[str, object]:
    """RFC 8414 authorization-server metadata for MCP client discovery."""
    issuer = get_settings().oauth_issuer
    return {
        "issuer": issuer,
        "authorization_endpoint": f"{issuer}/api/v1/oauth/authorize",
        "token_endpoint": f"{issuer}/api/v1/oauth/token",
        "registration_endpoint": f"{issuer}/api/v1/oauth/register",
        "revocation_endpoint": f"{issuer}/api/v1/oauth/revoke",
        "jwks_uri": f"{issuer}/api/v1/oauth/jwks.json",
        "scopes_supported": sorted(scope_catalog.ALL_SCOPES),
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "authorization_response_iss_parameter_supported": True,
    }


@router.get("/.well-known/oauth-protected-resource/api/v1/mcp")
async def protected_resource_metadata() -> dict[str, object]:
    """RFC 9728 protected-resource metadata for the embedded MCP server."""
    settings = get_settings()
    return {
        "resource": settings.mcp_resource_base,
        "authorization_servers": [settings.oauth_issuer],
        "scopes_supported": sorted(scope_catalog.ALL_SCOPES),
        "bearer_methods_supported": ["header"],
    }
