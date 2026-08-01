"""Custom intake form schemas (COS-51)."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class IntakeFormFieldIn(BaseModel):
    """A configurable form field."""

    key: str | None = None
    label: str = Field(min_length=1, max_length=120)
    type: str = "text"
    required: bool = False
    options: list[str] = Field(default_factory=list)


class IntakeFormIn(BaseModel):
    """Create a custom intake form."""

    name: str = Field(min_length=1, max_length=255)
    fields: list[IntakeFormFieldIn] = Field(default_factory=list)


class IntakeFormUpdateIn(BaseModel):
    """Edit a custom intake form."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    fields: list[IntakeFormFieldIn] | None = None
    enabled: bool | None = None


class IntakeFormOut(BaseModel):
    """Serialized intake form (admin view)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    token: str
    enabled: bool
    fields: list[dict[str, object]]


class PublicIntakeFormOut(BaseModel):
    """The public, anonymous view of a form."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    fields: list[dict[str, object]]


class IntakeFormSubmitIn(BaseModel):
    """A public submission against a form's fields."""

    title: str = Field(min_length=1, max_length=300)
    answers: dict[str, str] = Field(default_factory=dict)
