"""Validated LLM structured-output models — the AI response boundary."""

from typing import get_args

import pytest
from pydantic import TypeAdapter, ValidationError

from elliptic.modules.ai.outputs import (
    CHART_DIMENSIONS,
    CHART_METRICS,
    ActionProposalOutput,
    ChartSpecOutput,
    SummaryLineOutput,
    validate_llm_json,
)


def test_chart_spec_accepts_valid() -> None:
    spec = ChartSpecOutput.model_validate_json(
        '{"metric": "count", "dimension": "status", "title": "By status"}'
    )
    assert (spec.metric, spec.dimension, spec.title) == ("count", "status", "By status")


def test_chart_spec_rejects_bad_enum() -> None:
    with pytest.raises(ValidationError):
        ChartSpecOutput.model_validate_json('{"metric": "nope", "dimension": "status"}')


def test_chart_spec_literals_match_tuples() -> None:
    assert set(get_args(ChartSpecOutput.model_fields["metric"].annotation)) == set(CHART_METRICS)
    assert set(get_args(ChartSpecOutput.model_fields["dimension"].annotation)) == set(
        CHART_DIMENSIONS
    )


def test_action_proposal_rejects_unsupported_action() -> None:
    with pytest.raises(ValidationError):
        ActionProposalOutput.model_validate_json('{"action": "delete_everything"}')


def test_action_proposal_defaults() -> None:
    proposal = ActionProposalOutput.model_validate_json('{"action": "create_task", "title": "X"}')
    assert proposal.action == "create_task"
    assert proposal.priority == "none"
    assert proposal.project_key == ""
    assert proposal.description is None


def test_validate_llm_json_tolerates_prose_and_fences() -> None:
    adapter = TypeAdapter(ChartSpecOutput)
    noisy = 'Sure! ```json\n{"metric": "open", "dimension": "kind", "title": "t"}\n``` done'
    spec = validate_llm_json(adapter, noisy)
    assert spec is not None
    assert (spec.metric, spec.dimension) == ("open", "kind")


def test_validate_llm_json_returns_none_on_garbage() -> None:
    assert validate_llm_json(TypeAdapter(ChartSpecOutput), "no json here at all") is None


def test_validate_llm_json_list_adapter() -> None:
    adapter = TypeAdapter(list[SummaryLineOutput])
    lines = validate_llm_json(adapter, '[{"text": "a", "segment_ids": ["s1"]}, {"text": "b"}]')
    assert lines is not None
    assert len(lines) == 2
    assert (lines[0].text, lines[0].segment_ids) == ("a", ["s1"])
