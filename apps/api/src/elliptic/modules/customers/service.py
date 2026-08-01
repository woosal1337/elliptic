"""Customer business logic (COS-133)."""

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import NotFoundError
from elliptic.modules.customers.models import (
    Customer,
    CustomerRequest,
    customer_request_tasks,
)
from elliptic.modules.customers.schemas import (
    CustomerCreateIn,
    CustomerRequestCreateIn,
    CustomerRequestUpdateIn,
    CustomerUpdateIn,
)
from elliptic.modules.tasks.models import Task


async def list_customers(
    session: AsyncSession, ctx: OrgContext, search: str | None = None
) -> list[Customer]:
    query = select(Customer).where(Customer.org_id == ctx.org.id)
    if search:
        like = f"%{search.lower()}%"
        query = query.where(
            or_(
                Customer.name.ilike(like),
                Customer.email.ilike(like),
                Customer.industry.ilike(like),
            )
        )
    result = await session.scalars(query.order_by(Customer.name))
    return list(result)


async def create_customer(
    session: AsyncSession, ctx: OrgContext, payload: CustomerCreateIn
) -> Customer:
    customer = Customer(
        org_id=ctx.org.id,
        name=payload.name,
        description=payload.description,
        email=payload.email,
        website_url=payload.website_url,
        employees=payload.employees,
        industry=payload.industry,
        stage=payload.stage,
        contract_status=payload.contract_status,
        revenue=payload.revenue,
        created_by=ctx.user.id,
    )
    session.add(customer)
    await session.flush()
    return customer


async def get_customer(session: AsyncSession, ctx: OrgContext, customer_id: uuid.UUID) -> Customer:
    customer = await session.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.org_id == ctx.org.id)
    )
    if customer is None:
        raise NotFoundError("Customer not found")
    return customer


async def update_customer(
    session: AsyncSession, ctx: OrgContext, customer_id: uuid.UUID, payload: CustomerUpdateIn
) -> Customer:
    customer = await get_customer(session, ctx, customer_id)
    if payload.name is not None:
        customer.name = payload.name
    if payload.description is not None:
        customer.description = payload.description or None
    if payload.email is not None:
        customer.email = payload.email or None
    if payload.website_url is not None:
        customer.website_url = payload.website_url or None
    if payload.employees is not None:
        customer.employees = payload.employees
    if payload.industry is not None:
        customer.industry = payload.industry or None
    if payload.stage is not None:
        customer.stage = payload.stage or None
    if payload.clear_contract_status:
        customer.contract_status = None
    elif payload.contract_status is not None:
        customer.contract_status = payload.contract_status
    if payload.revenue is not None:
        customer.revenue = payload.revenue
    await session.flush()
    return customer


async def delete_customer(session: AsyncSession, ctx: OrgContext, customer_id: uuid.UUID) -> None:
    customer = await get_customer(session, ctx, customer_id)
    await session.delete(customer)
    await session.flush()


async def _serialize_request(session: AsyncSession, request: CustomerRequest) -> dict[str, object]:
    task_ids = list(
        await session.scalars(
            select(customer_request_tasks.c.task_id).where(
                customer_request_tasks.c.request_id == request.id
            )
        )
    )
    return {
        "id": request.id,
        "customer_id": request.customer_id,
        "title": request.title,
        "description": request.description,
        "status": request.status,
        "source_url": request.source_url,
        "task_ids": task_ids,
        "created_at": request.created_at,
    }


async def list_requests(
    session: AsyncSession, ctx: OrgContext, customer_id: uuid.UUID
) -> list[dict[str, object]]:
    await get_customer(session, ctx, customer_id)
    requests = list(
        await session.scalars(
            select(CustomerRequest)
            .where(
                CustomerRequest.customer_id == customer_id,
                CustomerRequest.org_id == ctx.org.id,
            )
            .order_by(CustomerRequest.created_at.desc())
        )
    )
    return [await _serialize_request(session, request) for request in requests]


async def create_request(
    session: AsyncSession,
    ctx: OrgContext,
    customer_id: uuid.UUID,
    payload: CustomerRequestCreateIn,
) -> dict[str, object]:
    await get_customer(session, ctx, customer_id)
    request = CustomerRequest(
        org_id=ctx.org.id,
        customer_id=customer_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        source_url=payload.source_url,
        created_by=ctx.user.id,
    )
    session.add(request)
    await session.flush()
    return await _serialize_request(session, request)


async def _get_request(
    session: AsyncSession, ctx: OrgContext, request_id: uuid.UUID
) -> CustomerRequest:
    request = await session.scalar(
        select(CustomerRequest).where(
            CustomerRequest.id == request_id, CustomerRequest.org_id == ctx.org.id
        )
    )
    if request is None:
        raise NotFoundError("Customer request not found")
    return request


async def update_request(
    session: AsyncSession,
    ctx: OrgContext,
    request_id: uuid.UUID,
    payload: CustomerRequestUpdateIn,
) -> dict[str, object]:
    request = await _get_request(session, ctx, request_id)
    if payload.title is not None:
        request.title = payload.title
    if payload.description is not None:
        request.description = payload.description or None
    if payload.status is not None:
        request.status = payload.status
    if payload.source_url is not None:
        request.source_url = payload.source_url or None
    await session.flush()
    return await _serialize_request(session, request)


async def delete_request(session: AsyncSession, ctx: OrgContext, request_id: uuid.UUID) -> None:
    request = await _get_request(session, ctx, request_id)
    await session.delete(request)
    await session.flush()


async def link_task(
    session: AsyncSession, ctx: OrgContext, request_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    await _get_request(session, ctx, request_id)
    task = await session.scalar(
        select(Task.id).where(Task.id == task_id, Task.org_id == ctx.org.id)
    )
    if task is None:
        raise NotFoundError("Work item not found")
    exists = await session.scalar(
        select(customer_request_tasks.c.task_id).where(
            customer_request_tasks.c.request_id == request_id,
            customer_request_tasks.c.task_id == task_id,
        )
    )
    if exists is None:
        await session.execute(
            customer_request_tasks.insert().values(request_id=request_id, task_id=task_id)
        )
        await session.flush()


async def unlink_task(
    session: AsyncSession, ctx: OrgContext, request_id: uuid.UUID, task_id: uuid.UUID
) -> None:
    await _get_request(session, ctx, request_id)
    await session.execute(
        customer_request_tasks.delete().where(
            customer_request_tasks.c.request_id == request_id,
            customer_request_tasks.c.task_id == task_id,
        )
    )
    await session.flush()
