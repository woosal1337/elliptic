"""Git connection schemas (COS-256)."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class GitConnectionIn(BaseModel):
    owner: str = Field(min_length=1, max_length=255)
    repo: str = Field(min_length=1, max_length=255)


class GitConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    provider: str
    owner: str
    repo: str
    token: str
    enabled: bool


class BranchNameOut(BaseModel):
    branch_name: str
