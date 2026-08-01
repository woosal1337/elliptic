"""IdP group sync schemas (COS-181)."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

from elliptic.modules.projects.models import ProjectRole


class MappingIn(BaseModel):
    idp_group: str = Field(min_length=1, max_length=255)
    project_id: uuid.UUID
    role: ProjectRole = ProjectRole.MEMBER


class MappingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    idp_group: str
    project_id: uuid.UUID
    role: ProjectRole


class SyncPreviewIn(BaseModel):
    user_id: uuid.UUID
    groups: list[str] = Field(default_factory=list)


class SyncDiffOut(BaseModel):
    adds: list[dict[str, str]]
    changes: list[dict[str, str]]
    removes: list[dict[str, str]]
