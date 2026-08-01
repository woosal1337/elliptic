"""Meeting template schemas."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class MeetingTemplateIn(BaseModel):
    """Payload to create a custom meeting template."""

    name: str = Field(min_length=1, max_length=200)
    sections: list[str] = Field(default_factory=list)
    prompt_scaffold: str | None = None


class MeetingTemplateUpdateIn(BaseModel):
    """Editable template fields; only provided keys are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    sections: list[str] | None = None
    prompt_scaffold: str | None = None


class MeetingTemplateOut(BaseModel):
    """Serialized custom template; ``built_in`` is always false for stored rows."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sections: list[str]
    prompt_scaffold: str | None
    built_in: bool = False


class MeetingRecipeIn(BaseModel):
    """Payload to save a custom recipe."""

    name: str = Field(min_length=1, max_length=200)
    prompt: str = Field(min_length=1)


class MeetingRecipeOut(BaseModel):
    """Serialized custom recipe; ``built_in`` is always false for stored rows."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    prompt: str
    built_in: bool = False
