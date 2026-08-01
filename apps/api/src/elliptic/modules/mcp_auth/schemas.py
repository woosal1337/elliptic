"""Request and response schemas for the OAuth authorization server."""

from datetime import datetime

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """RFC 7591 dynamic client registration request."""

    client_name: str = "AI client"
    redirect_uris: list[str]
    grant_types: list[str] | None = None
    token_endpoint_auth_method: str | None = None
    scope: str | None = None


class RegisterResponse(BaseModel):
    """RFC 7591 registration response (client metadata)."""

    client_id: str
    client_name: str
    redirect_uris: list[str]
    grant_types: list[str]
    token_endpoint_auth_method: str


class ConsentScope(BaseModel):
    """One scope as shown on the consent screen."""

    scope: str
    domain: str
    label: str
    elevated: bool
    baseline: bool
    requested: bool


class ConsentOrg(BaseModel):
    """One organization the user may grant access to."""

    id: str
    name: str
    role: str


class ConsentContext(BaseModel):
    """The data the consent page renders for one authorization request."""

    request_id: str
    client_name: str
    client_unverified: bool
    orgs: list[ConsentOrg]
    scopes: list[ConsentScope]
    can_grant_all_orgs: bool = False


class DecisionRequest(BaseModel):
    """The user's consent decision.

    Provide ``org_id`` for a single-organization grant, or set ``all_orgs=True``
    for a multi-org grant spanning every organization the user belongs to."""

    request_id: str
    decision: str
    org_id: str | None = None
    all_orgs: bool = False
    scopes: list[str]


class DecisionResponse(BaseModel):
    """Where the client should be redirected after a decision."""

    redirect_to: str


class TokenResponse(BaseModel):
    """RFC 6749 token endpoint response."""

    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str | None = None
    scope: str | None = None


class GrantOut(BaseModel):
    """A connected-app grant shown on the AI Access settings page."""

    grant_id: str
    client_name: str
    org_id: str
    org_name: str
    scopes: list[str]
    status: str
    created_at: datetime


class AppCreateIn(BaseModel):
    """Register a confidential OAuth app (COS-198)."""

    name: str = Field(min_length=1, max_length=255)


class AppCreateOut(BaseModel):
    """The new app with its one-time client_secret."""

    client_id: str
    client_secret: str
    client_name: str


class AppOut(BaseModel):
    """A registered confidential app (no secret)."""

    client_id: str
    client_name: str
    created_at: datetime
