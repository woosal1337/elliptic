"""Public intake form schemas."""

from pydantic import BaseModel, Field


class IntakeFormOut(BaseModel):
    """Public-facing form descriptor (no internal ids)."""

    project_name: str
    org_name: str


class IntakeSubmitIn(BaseModel):
    """A no-account intake submission."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=10000)
    submitter_name: str | None = Field(default=None, max_length=255)
    submitter_email: str | None = Field(default=None, max_length=320)


class IntakeSubmitOut(BaseModel):
    """Confirmation of a successful submission."""

    reference: str
    message: str = "Thanks — your request has been received."


class IntakeStateOut(BaseModel):
    """Admin view of a project's intake configuration."""

    intake_enabled: bool
    intake_inapp_enabled: bool = False
    intake_token: str | None
