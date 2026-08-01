"""LDAP schemas (COS-173)."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class LDAPConnectionIn(BaseModel):
    server_uri: str = Field(min_length=1, max_length=500)
    use_tls: bool = True
    bind_dn: str = Field(min_length=1, max_length=500)
    bind_password: str | None = Field(default=None, max_length=500)
    search_base: str = Field(min_length=1, max_length=500)
    search_filter: str = Field(default="(sAMAccountName={username})", max_length=500)
    attr_email: str = Field(default="mail", max_length=100)
    attr_first: str = Field(default="givenName", max_length=100)
    attr_last: str = Field(default="sn", max_length=100)
    enabled: bool = True


class LDAPConnectionOut(BaseModel):
    """An org's LDAP connection (the bind password is never returned)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    server_uri: str
    use_tls: bool
    bind_dn: str
    search_base: str
    search_filter: str
    attr_email: str
    attr_first: str
    attr_last: str
    enabled: bool


class LDAPLoginIn(BaseModel):
    org_id: uuid.UUID
    username: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1, max_length=500)


class LDAPTestResult(BaseModel):
    ok: bool
    message: str
