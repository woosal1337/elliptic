"""Auth-provider schemas (COS-209)."""

from pydantic import BaseModel, ConfigDict, Field


class AuthProviderConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    magic_code_enabled: bool
    password_enabled: bool
    google_enabled: bool
    github_enabled: bool
    allow_self_signup: bool
    restrict_oauth_to_verified_domains: bool


class AuthProviderConfigIn(BaseModel):
    magic_code_enabled: bool | None = None
    password_enabled: bool | None = None
    google_enabled: bool | None = None
    github_enabled: bool | None = None
    allow_self_signup: bool | None = None
    restrict_oauth_to_verified_domains: bool | None = None


class PublicProvidersOut(BaseModel):
    """What the login screen should render (COS-209)."""

    password: bool = True
    magic_code: bool = True
    google: bool = False
    github: bool = False


class NativeExchangeIn(BaseModel):
    """Handoff code from the native callback plus the verifier that unlocks it."""

    code: str = Field(min_length=1, max_length=4096)
    verifier: str = Field(min_length=32, max_length=256)
