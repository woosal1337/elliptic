"""Domain-verification schemas (COS-193)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.domains.models import DomainStatus


class DomainCreateIn(BaseModel):
    domain: str = Field(min_length=3, max_length=255)


class DomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    domain: str
    status: DomainStatus
    txt_name: str = "@"
    txt_record: str
    verified_at: datetime | None = None

    @classmethod
    def from_record(cls, record: object) -> "DomainOut":
        return cls(
            id=record.id,  # type: ignore[attr-defined]
            domain=record.domain,  # type: ignore[attr-defined]
            status=record.status,  # type: ignore[attr-defined]
            txt_record=f"companyos-verify={record.txt_token}",  # type: ignore[attr-defined]
            verified_at=record.verified_at,  # type: ignore[attr-defined]
        )
