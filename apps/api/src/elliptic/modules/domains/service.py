"""Domain-verification service (COS-193)."""

import secrets
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, ConflictError, NotFoundError
from elliptic.core.models_base import utcnow
from elliptic.modules.domains.models import DomainStatus, OrgDomain

_TXT_PREFIX = "companyos-verify="


def _normalize(domain: str) -> str:
    cleaned = domain.strip().lower().removeprefix("http://").removeprefix("https://").strip("/")
    if "@" in cleaned:
        cleaned = cleaned.split("@", 1)[1]
    if not cleaned or "." not in cleaned or " " in cleaned:
        raise BadRequestError("Enter a valid domain (e.g. example.com)")
    return cleaned


async def resolve_txt_records(domain: str) -> list[str]:
    """Look up TXT records via DNS-over-HTTPS (no extra dependency). Mocked in tests."""
    async with httpx.AsyncClient(timeout=5.0) as http:
        resp = await http.get("https://dns.google/resolve", params={"name": domain, "type": "TXT"})
        resp.raise_for_status()
        data = resp.json()
    return [str(a.get("data", "")).strip('"') for a in data.get("Answer", [])]


async def list_domains(session: AsyncSession, ctx: OrgContext) -> list[OrgDomain]:
    result = await session.scalars(
        select(OrgDomain).where(OrgDomain.org_id == ctx.org.id).order_by(OrgDomain.created_at)
    )
    return list(result)


async def create_domain(session: AsyncSession, ctx: OrgContext, domain: str) -> OrgDomain:
    normalized = _normalize(domain)
    existing = await session.scalar(
        select(OrgDomain).where(OrgDomain.org_id == ctx.org.id, OrgDomain.domain == normalized)
    )
    if existing is not None:
        raise ConflictError("This domain is already added")
    verified_elsewhere = await session.scalar(
        select(OrgDomain.id).where(
            OrgDomain.domain == normalized, OrgDomain.status == DomainStatus.VERIFIED
        )
    )
    if verified_elsewhere is not None:
        raise ConflictError("This domain is already verified by another workspace")
    record = OrgDomain(org_id=ctx.org.id, domain=normalized, txt_token=secrets.token_hex(16))
    session.add(record)
    await session.flush()
    return record


async def verify_domain(session: AsyncSession, ctx: OrgContext, domain_id: uuid.UUID) -> OrgDomain:
    record = await session.scalar(
        select(OrgDomain).where(OrgDomain.id == domain_id, OrgDomain.org_id == ctx.org.id)
    )
    if record is None:
        raise NotFoundError("Domain not found")
    if record.status is DomainStatus.VERIFIED:
        return record
    expected = f"{_TXT_PREFIX}{record.txt_token}"
    txts = await resolve_txt_records(record.domain)
    if expected not in txts:
        raise BadRequestError(
            "TXT record not found yet. Add the record and allow time for DNS to propagate."
        )
    taken = await session.scalar(
        select(OrgDomain.id).where(
            OrgDomain.domain == record.domain,
            OrgDomain.status == DomainStatus.VERIFIED,
            OrgDomain.id != record.id,
        )
    )
    if taken is not None:
        raise ConflictError("This domain is already verified by another workspace")
    record.status = DomainStatus.VERIFIED
    record.verified_at = utcnow()
    await session.flush()
    return record


async def delete_domain(session: AsyncSession, ctx: OrgContext, domain_id: uuid.UUID) -> None:
    record = await session.scalar(
        select(OrgDomain).where(OrgDomain.id == domain_id, OrgDomain.org_id == ctx.org.id)
    )
    if record is None:
        raise NotFoundError("Domain not found")
    await session.delete(record)
    await session.flush()
