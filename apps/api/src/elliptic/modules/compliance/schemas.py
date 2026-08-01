"""Compliance schemas (COS-233)."""

import uuid

from pydantic import BaseModel, Field


class CompliancePostureOut(BaseModel):
    residency_region: str | None
    compliance_frameworks: list[str]
    data_controller: str | None
    dpo_contact: str | None


class DataSubjectExportOut(BaseModel):
    subject: dict[str, object]
    content: dict[str, object]


class ErasureRequestIn(BaseModel):
    user_id: uuid.UUID
    reason: str | None = Field(default=None, max_length=1000)


class ErasureRequestOut(BaseModel):
    subject_id: str
    status: str
