"""Instance admin schemas (COS-223)."""

from pydantic import BaseModel, ConfigDict, Field


class InstanceSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    instance_name: str
    telemetry_enabled: bool
    allow_workspace_creation: bool
    air_gapped: bool = False
    email_from: str | None


class InstanceSettingsIn(BaseModel):
    instance_name: str | None = Field(default=None, max_length=200)
    telemetry_enabled: bool | None = None
    allow_workspace_creation: bool | None = None
    air_gapped: bool | None = None
    email_from: str | None = Field(default=None, max_length=255)


class InstanceUserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_instance_admin: bool
    suspended: bool
    org_count: int
    created_at: str


class LicenseIssueIn(BaseModel):
    plan: str = Field(default="enterprise", max_length=20)
    seats: int = Field(default=0, ge=0)
    licensee: str | None = Field(default=None, max_length=255)
    days: int | None = Field(default=None, ge=1)


class LicenseActivateIn(BaseModel):
    token: str = Field(min_length=1)


class LicenseOut(BaseModel):
    plan: str
    seats: int
    licensee: str | None
    expires_at: str | None
    active: bool
