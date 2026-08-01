"""LDAP/AD bind authentication + connection config (COS-173)."""

import asyncio
import secrets
import uuid

import ldap3  # type: ignore[import-untyped]
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import BadRequestError, NotFoundError, UnauthorizedError
from elliptic.core.security import hash_password
from elliptic.modules.ldap.models import LDAPConnection
from elliptic.modules.orgs.models import OrganizationMember, OrgRole
from elliptic.modules.users.models import User

_AAD = b"ldap-bind-secret"


async def get_connection(session: AsyncSession, org_id: uuid.UUID) -> LDAPConnection | None:
    conn: LDAPConnection | None = await session.scalar(
        select(LDAPConnection).where(LDAPConnection.org_id == org_id)
    )
    return conn


async def upsert_connection(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    server_uri: str,
    use_tls: bool,
    bind_dn: str,
    bind_password: str | None,
    search_base: str,
    search_filter: str,
    attr_email: str,
    attr_first: str,
    attr_last: str,
    enabled: bool,
) -> LDAPConnection:
    conn = await get_connection(session, ctx.org.id)
    kek = get_settings().kek_bytes
    if conn is None:
        if not bind_password:
            raise BadRequestError("A bind password is required when configuring LDAP")
        nonce, ciphertext = encrypt_secret(bind_password, kek, _AAD)
        conn = LDAPConnection(
            org_id=ctx.org.id,
            server_uri=server_uri,
            use_tls=use_tls,
            bind_dn=bind_dn,
            encrypted_bind_pw=ciphertext,
            nonce=nonce,
            search_base=search_base,
            search_filter=search_filter,
            attr_email=attr_email,
            attr_first=attr_first,
            attr_last=attr_last,
            enabled=enabled,
        )
        session.add(conn)
    else:
        conn.server_uri = server_uri
        conn.use_tls = use_tls
        conn.bind_dn = bind_dn
        conn.search_base = search_base
        conn.search_filter = search_filter
        conn.attr_email = attr_email
        conn.attr_first = attr_first
        conn.attr_last = attr_last
        conn.enabled = enabled
        if bind_password:
            nonce, ciphertext = encrypt_secret(bind_password, kek, _AAD)
            conn.encrypted_bind_pw = ciphertext
            conn.nonce = nonce
    await session.flush()
    return conn


async def delete_connection(session: AsyncSession, ctx: OrgContext) -> None:
    conn = await get_connection(session, ctx.org.id)
    if conn is not None:
        await session.delete(conn)
        await session.flush()


def _bind_password(conn: LDAPConnection) -> str:
    return decrypt_secret(conn.nonce, conn.encrypted_bind_pw, get_settings().kek_bytes, _AAD)


def _ldap_authenticate(conn: LDAPConnection, username: str, password: str) -> dict[str, str] | None:
    """Service-bind, find the user, rebind as them. Returns attrs or None (COS-173).

    Runs in a worker thread (blocking ldap3). Mocked in tests.
    """
    server = ldap3.Server(conn.server_uri, use_ssl=conn.use_tls, get_info=ldap3.NONE)
    svc = ldap3.Connection(server, user=conn.bind_dn, password=_bind_password(conn))
    if not svc.bind():
        raise UnauthorizedError("LDAP service bind failed")
    try:
        svc.search(
            conn.search_base,
            conn.search_filter.format(username=ldap3.utils.conv.escape_filter_chars(username)),
            attributes=[conn.attr_email, conn.attr_first, conn.attr_last],
        )
        if not svc.entries:
            return None
        entry = svc.entries[0]
        user_dn = entry.entry_dn

        user_conn = ldap3.Connection(server, user=user_dn, password=password)
        if not user_conn.bind():
            return None
        user_conn.unbind()

        def _attr(name: str) -> str:
            value = entry[name].value if name in entry else None
            return str(value) if value else ""

        return {
            "email": _attr(conn.attr_email),
            "first": _attr(conn.attr_first),
            "last": _attr(conn.attr_last),
        }
    finally:
        svc.unbind()


async def authenticate(
    session: AsyncSession, org_id: uuid.UUID, username: str, password: str
) -> User:
    """Authenticate a user against the org's directory and JIT-provision them (COS-173)."""
    conn = await get_connection(session, org_id)
    if conn is None or not conn.enabled:
        raise UnauthorizedError("LDAP is not configured for this workspace")
    attrs = await asyncio.to_thread(_ldap_authenticate, conn, username, password)
    if attrs is None or not attrs.get("email"):
        raise UnauthorizedError("Invalid directory credentials")
    email = attrs["email"].strip().lower()
    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        full_name = " ".join(p for p in [attrs.get("first"), attrs.get("last")] if p) or email
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            full_name=full_name,
            email_verified=True,
        )
        session.add(user)
        await session.flush()
    membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id, OrganizationMember.user_id == user.id
        )
    )
    if membership is None:
        session.add(OrganizationMember(org_id=org_id, user_id=user.id, role=OrgRole.MEMBER))
        await session.flush()
    return user


def _test_bind(conn: LDAPConnection) -> dict[str, object]:
    """Run the service bind + a sample search; return diagnostics (COS-173)."""
    try:
        server = ldap3.Server(conn.server_uri, use_ssl=conn.use_tls, get_info=ldap3.NONE)
        svc = ldap3.Connection(server, user=conn.bind_dn, password=_bind_password(conn))
        if not svc.bind():
            return {"ok": False, "message": "Service bind failed — check bind DN and password."}
        svc.search(conn.search_base, "(objectClass=*)", size_limit=1)
        count = len(svc.entries)
        svc.unbind()
        return {"ok": True, "message": f"Connected. Search base returned {count} sample entry."}
    except Exception as exc:
        return {"ok": False, "message": f"Connection failed: {exc}"}


async def test_bind(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:
    conn = await get_connection(session, ctx.org.id)
    if conn is None:
        raise NotFoundError("LDAP is not configured")
    return await asyncio.to_thread(_test_bind, conn)
