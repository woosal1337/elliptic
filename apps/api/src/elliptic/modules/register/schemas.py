"""Register (RAID / decisions / risks) schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from elliptic.modules.register.models import RegisterKind, RegisterStatus


class RegisterEntryIn(BaseModel):
    """Create a register entry."""

    kind: RegisterKind
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    status: RegisterStatus = RegisterStatus.OPEN
    owner_id: uuid.UUID | None = None
    probability: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    due_date: date | None = None


class RegisterEntryUpdateIn(BaseModel):
    """Edit a register entry (fields left unset are unchanged)."""

    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    status: RegisterStatus | None = None
    owner_id: uuid.UUID | None = None
    clear_owner: bool = False
    probability: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    due_date: date | None = None
    clear_due_date: bool = False


class RegisterEntryOut(BaseModel):
    """Serialized register entry, with the derived risk score."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    kind: RegisterKind
    title: str
    description: str | None
    status: RegisterStatus
    owner_id: uuid.UUID | None
    probability: int | None
    impact: int | None
    risk_score: int | None = None
    due_date: date | None
    created_by: uuid.UUID | None
    created_at: datetime

    @model_validator(mode="after")
    def _score(self) -> "RegisterEntryOut":
        if self.probability is not None and self.impact is not None:
            object.__setattr__(self, "risk_score", self.probability * self.impact)
        return self
