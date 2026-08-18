"""Organization, member, and invitation schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from elliptic.modules.orgs.models import InviteStatus, OrgRole


class OrgCreateIn(BaseModel):
    """Payload to create an organization."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class OrgUpdateIn(BaseModel):
    """Editable organization fields."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    block_backward_transitions: bool | None = None
    residency_region: str | None = Field(default=None, max_length=20)
    compliance_frameworks: list[str] | None = None
    data_controller: str | None = Field(default=None, max_length=255)
    dpo_contact: str | None = Field(default=None, max_length=255)


class OrgOut(BaseModel):
    """Serialized organization."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    block_backward_transitions: bool = False
    residency_region: str | None = None
    compliance_frameworks: list[str] = []
    data_controller: str | None = None
    dpo_contact: str | None = None
    created_at: datetime


class MemberOut(BaseModel):
    """Serialized org membership with user identity."""

    id: uuid.UUID
    user_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: OrgRole
    created_at: datetime


class MemberRoleUpdateIn(BaseModel):
    """Payload to change a member's role."""

    role: OrgRole


class InviteCreateIn(BaseModel):
    """Payload to invite a user by email."""

    email: EmailStr
    role: OrgRole = OrgRole.MEMBER
    project_id: uuid.UUID | None = None


class InviteOut(BaseModel):
    """Serialized invitation, token only present at creation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    role: OrgRole
    status: InviteStatus
    expires_at: datetime
    created_at: datetime
    project_id: uuid.UUID | None = None
    token: str | None = None


class InviteAcceptIn(BaseModel):
    """Payload to accept an invitation by token."""

    token: str


class InvitePreviewOut(BaseModel):
    """Public, token-resolved preview of an invitation (no auth required).

    ``status`` is the *effective* status: a pending invite past its expiry is
    reported as ``expired``. ``acceptable`` is true only when the invite can
    still be accepted.
    """

    org_id: uuid.UUID
    org_name: str
    email: EmailStr
    role: OrgRole
    status: InviteStatus
    expires_at: datetime
    acceptable: bool


class SeatUsageOut(BaseModel):
    """Seat-billing accounting for an org (COS-207)."""

    billable_seats: int
    free_seats: int
    total_members: int
    by_role: dict[str, int]
    billable_roles: list[str]


class OnboardingStep(BaseModel):
    """One get-started checklist item (COS-136)."""

    key: str
    label: str
    done: bool


class OnboardingOut(BaseModel):
    """Get-started checklist progress."""

    steps: list[OnboardingStep]
    completed: int
    total: int
    complete: bool


class PlanOption(BaseModel):
    plan: str
    label: str
    seat_limit: int


class EditionOut(BaseModel):
    """An org's edition + seat licensing status (COS-197)."""

    plan: str
    label: str
    seat_limit: int
    billable_seats: int
    over_seat_limit: bool
    seats_remaining: int
    features: list[str]
    available_plans: list[PlanOption]


class SetPlanIn(BaseModel):
    """Change the org's edition."""

    plan: str = Field(min_length=1, max_length=20)


class PermissionDef(BaseModel):
    key: str
    label: str


class CustomRoleIn(BaseModel):
    """Define or update a custom role (COS-176/182)."""

    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: list[str] = Field(default_factory=list)
    matrix: dict[str, dict[str, str]] = Field(default_factory=dict)


class CustomRoleUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: list[str] | None = None
    matrix: dict[str, dict[str, str]] | None = None


class CustomRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    permissions: list[str]
    matrix: dict[str, dict[str, str]] = {}


class AssignRoleIn(BaseModel):
    user_id: uuid.UUID
    custom_role_id: uuid.UUID | None = None


class PermissionsOut(BaseModel):
    catalog: list[PermissionDef]
    granted: list[str]
    matrix_schema: list[dict[str, object]] = []
    matrix_cells: list[str] = []
