"""RBAC audit trail schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from elliptic.modules.rbac_audit.models import RbacAction, RbacResourceScope


class RbacAuditOut(BaseModel):
    """A serialized RBAC audit record with resolved display names."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    actor_id: uuid.UUID | None
    actor_name: str
    actor_type: str
    subject_user_id: uuid.UUID | None
    subject_name: str | None
    resource_scope: RbacResourceScope
    resource_id: uuid.UUID
    project_id: uuid.UUID | None
    action: RbacAction
    role_before: str | None
    role_after: str | None
    detail: dict[str, Any] | None
