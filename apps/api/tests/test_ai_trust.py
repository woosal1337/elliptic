"""AI confidence/coverage trust primitive (MA-13)."""

from elliptic.modules.ai.trust import (
    ConfidenceLevel,
    Coverage,
    TrustSignal,
    derive_confidence,
)


def test_no_evidence_is_low() -> None:
    assert derive_confidence(0, 0) is ConfidenceLevel.LOW
    assert derive_confidence(8, 0) is ConfidenceLevel.LOW
    assert derive_confidence(0, 3) is ConfidenceLevel.LOW


def test_thin_evidence_is_partial() -> None:
    assert derive_confidence(8, 2) is ConfidenceLevel.PARTIAL
    assert derive_confidence(10, 1) is ConfidenceLevel.PARTIAL
    assert derive_confidence(3, 1) is ConfidenceLevel.PARTIAL


def test_strong_majority_evidence_is_high() -> None:
    assert derive_confidence(2, 2) is ConfidenceLevel.HIGH
    assert derive_confidence(4, 3) is ConfidenceLevel.HIGH
    assert derive_confidence(6, 5) is ConfidenceLevel.HIGH


def test_single_relevant_source_never_high() -> None:
    assert derive_confidence(1, 1) is ConfidenceLevel.PARTIAL


def test_trust_signal_from_counts_carries_both() -> None:
    signal = TrustSignal.from_counts(8, 2)
    assert signal == TrustSignal(
        coverage=Coverage(consulted=8, relevant=2), confidence=ConfidenceLevel.PARTIAL
    )
    assert signal.coverage.consulted == 8
    assert signal.coverage.relevant == 2
    assert signal.confidence is ConfidenceLevel.PARTIAL
