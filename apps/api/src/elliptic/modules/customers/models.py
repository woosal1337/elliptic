"""Customer (CRM-lite account) model (COS-133)."""

import enum
import uuid
from decimal import Decimal

from sqlalchemy import Column, Enum, ForeignKey, Integer, Numeric, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import Base, BaseModel


class ContractStatus(enum.StrEnum):
    """Where a customer sits in the contract lifecycle."""

    PROSPECT = "prospect"
    TRIAL = "trial"
    ACTIVE = "active"
    CHURNED = "churned"


class Customer(BaseModel):
    """A workspace-level customer account profile (CRM-lite)."""

    __tablename__ = "customers"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(120), nullable=True)
    contract_status: Mapped[ContractStatus | None] = mapped_column(
        Enum(ContractStatus, native_enum=False, length=20), nullable=True
    )
    revenue: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class CustomerRequestStatus(enum.StrEnum):
    """Lifecycle of a customer request."""

    OPEN = "open"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


customer_request_tasks = Table(
    "customer_request_tasks",
    Base.metadata,
    Column(
        "request_id",
        ForeignKey("customer_requests.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    Column(
        "task_id",
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
)


class CustomerRequest(BaseModel):
    """A named customer ask (feature/support) linked to one or more work items (COS-140)."""

    __tablename__ = "customer_requests"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CustomerRequestStatus] = mapped_column(
        Enum(CustomerRequestStatus, native_enum=False, length=20),
        default=CustomerRequestStatus.OPEN,
        server_default=CustomerRequestStatus.OPEN.name,
    )
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
