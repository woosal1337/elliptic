"""Custom work-item property definitions."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from elliptic.core.models_base import BaseModel


class PropertyType(enum.StrEnum):
    """The data type of a custom property."""

    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    SELECT = "select"
    CHECKBOX = "checkbox"
    URL = "url"


class CustomProperty(BaseModel):
    """A project-scoped custom field definition for work items."""

    __tablename__ = "custom_properties"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[PropertyType] = mapped_column(Enum(PropertyType, native_enum=False, length=20))
    options: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )


class PropertyTemplate(BaseModel):
    """A workspace-level custom-property definition admins import into projects (COS-88).

    Define once at the org level (governance), then project admins import a copy
    into individual projects' custom-property sets.
    """

    __tablename__ = "property_templates"

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[PropertyType] = mapped_column(Enum(PropertyType, native_enum=False, length=20))
    options: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
