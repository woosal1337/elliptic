"""Customer endpoints (COS-133)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from elliptic.core.deps import OrgCtx, SessionDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.customers import service
from elliptic.modules.customers.schemas import (
    CustomerCreateIn,
    CustomerOut,
    CustomerRequestCreateIn,
    CustomerRequestOut,
    CustomerRequestUpdateIn,
    CustomerUpdateIn,
)

router = APIRouter(prefix="/orgs/{org_id}/customers", tags=["customers"])


@router.get("")
async def list_customers(
    ctx: OrgCtx,
    session: SessionDep,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> SuccessResponse[list[CustomerOut]]:
    customers = await service.list_customers(session, ctx, search)
    return ok([CustomerOut.model_validate(c) for c in customers])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CustomerOut]:
    customer = await service.create_customer(session, ctx, payload)
    return ok(CustomerOut.model_validate(customer), message="Customer created")


@router.get("/{customer_id}")
async def get_customer(
    customer_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CustomerOut]:
    customer = await service.get_customer(session, ctx, customer_id)
    return ok(CustomerOut.model_validate(customer))


@router.patch("/{customer_id}")
async def update_customer(
    customer_id: uuid.UUID, payload: CustomerUpdateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[CustomerOut]:
    customer = await service.update_customer(session, ctx, customer_id, payload)
    return ok(CustomerOut.model_validate(customer), message="Customer updated")


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_customer(session, ctx, customer_id)
    return ok(None, message="Customer deleted")


@router.get("/{customer_id}/requests")
async def list_requests(
    customer_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[CustomerRequestOut]]:
    requests = await service.list_requests(session, ctx, customer_id)
    return ok([CustomerRequestOut.model_validate(r) for r in requests])


@router.post("/{customer_id}/requests", status_code=status.HTTP_201_CREATED)
async def create_request(
    customer_id: uuid.UUID,
    payload: CustomerRequestCreateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[CustomerRequestOut]:
    request = await service.create_request(session, ctx, customer_id, payload)
    return ok(CustomerRequestOut.model_validate(request), message="Request created")


@router.patch("/requests/{request_id}")
async def update_request(
    request_id: uuid.UUID,
    payload: CustomerRequestUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[CustomerRequestOut]:
    request = await service.update_request(session, ctx, request_id, payload)
    return ok(CustomerRequestOut.model_validate(request), message="Request updated")


@router.delete("/requests/{request_id}")
async def delete_request(
    request_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_request(session, ctx, request_id)
    return ok(None, message="Request deleted")


@router.post("/requests/{request_id}/tasks/{task_id}", status_code=status.HTTP_201_CREATED)
async def link_task(
    request_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.link_task(session, ctx, request_id, task_id)
    return ok(None, message="Work item linked")


@router.delete("/requests/{request_id}/tasks/{task_id}")
async def unlink_task(
    request_id: uuid.UUID, task_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.unlink_task(session, ctx, request_id, task_id)
    return ok(None, message="Work item unlinked")
