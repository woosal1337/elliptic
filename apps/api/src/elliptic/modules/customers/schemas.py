"""Customer schemas (COS-133)."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.customers.models import ContractStatus, CustomerRequestStatus


class CustomerCreateIn(BaseModel):
    """Create a customer."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    email: str | None = Field(default=None, max_length=320)
    website_url: str | None = Field(default=None, max_length=500)
    employees: int | None = Field(default=None, ge=0)
    industry: str | None = Field(default=None, max_length=120)
    stage: str | None = Field(default=None, max_length=120)
    contract_status: ContractStatus | None = None
    revenue: Decimal | None = Field(default=None, ge=0)


class CustomerUpdateIn(BaseModel):
    """Edit a customer."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    email: str | None = Field(default=None, max_length=320)
    website_url: str | None = Field(default=None, max_length=500)
    employees: int | None = Field(default=None, ge=0)
    industry: str | None = Field(default=None, max_length=120)
    stage: str | None = Field(default=None, max_length=120)
    contract_status: ContractStatus | None = None
    clear_contract_status: bool = False
    revenue: Decimal | None = Field(default=None, ge=0)


class CustomerOut(BaseModel):
    """Serialized customer."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    email: str | None
    website_url: str | None
    employees: int | None
    industry: str | None
    stage: str | None
    contract_status: ContractStatus | None
    revenue: Decimal | None
    created_at: datetime
    updated_at: datetime


class CustomerRequestCreateIn(BaseModel):
    """Create a customer request (COS-140)."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: CustomerRequestStatus = CustomerRequestStatus.OPEN
    source_url: str | None = Field(default=None, max_length=500)


class CustomerRequestUpdateIn(BaseModel):
    """Edit a customer request."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    status: CustomerRequestStatus | None = None
    source_url: str | None = Field(default=None, max_length=500)


class CustomerRequestOut(BaseModel):
    """Serialized customer request with linked work-item ids."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    title: str
    description: str | None
    status: CustomerRequestStatus
    source_url: str | None
    task_ids: list[uuid.UUID] = Field(default_factory=list)
    created_at: datetime
