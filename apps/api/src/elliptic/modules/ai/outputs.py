"""Pydantic models for validated LLM structured outputs — the AI response boundary.

These back the providers' structured-output request (OpenAI ``response_format`` JSON
schema / Anthropic tool-use) and validate the reply via ``model_validate_json``, so a
malformed or off-spec model response is caught by Pydantic instead of hand-parsed.
Closed value sets use ``Literal``; free-text fields stay plain ``str`` and are
truncated/coerced at the call site, preserving the prior lenient behaviour.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

CHART_DIMENSIONS = ("status", "priority", "kind", "assignee", "project")
CHART_METRICS = ("count", "done", "open")


class ChartSpecOutput(BaseModel):
    """LLM output for ``ai_chart``: a metric, a breakdown dimension, and a title."""

    model_config = ConfigDict(extra="ignore")

    metric: Literal["count", "done", "open"]
    dimension: Literal["status", "priority", "kind", "assignee", "project"]
    title: str = ""


class ActionProposalOutput(BaseModel):
    """LLM output for ``propose_action``: one structured ``create_task`` proposal."""

    model_config = ConfigDict(extra="ignore")

    action: Literal["create_task"]
    project_key: str = ""
    title: str = ""
    description: str | None = None
    priority: str = "none"


class SummaryLineOutput(BaseModel):
    """One source-anchored meeting-summary line."""

    model_config = ConfigDict(extra="ignore")

    text: str
    section: str = ""
    segment_ids: list[str] = Field(default_factory=list)


def validate_llm_json[T](adapter: TypeAdapter[T], content: str) -> T | None:
    """Validate model JSON out of possibly-noisy LLM text; ``None`` if unrecoverable.

    Tolerates Markdown ``` fences and surrounding prose by also trying the first
    ``{...}`` / ``[...]`` span, mirroring the resilience of the prior hand-parsers.
    """
    body = content.strip()
    if body.startswith("```"):
        body = body.strip("`")
        if body[:4].lower() == "json":
            body = body[4:]
        body = body.strip()
    candidates = [body]
    for opener, closer in (("{", "}"), ("[", "]")):
        start, end = body.find(opener), body.rfind(closer)
        if start != -1 and end > start:
            span = body[start : end + 1]
            if span != body:
                candidates.append(span)
    for candidate in candidates:
        try:
            return adapter.validate_json(candidate)
        except ValidationError:
            continue
    return None
