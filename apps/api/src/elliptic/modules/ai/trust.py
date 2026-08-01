"""Shared AI trust primitives: coverage counts and a derived confidence band.

Every AI surface (meeting summaries, single- and cross-meeting chat, briefs,
filing and context aggregation) speaks the same trust contract so the UI can
render a uniform "consulted N / M relevant" coverage note and an explicit
confidence band instead of a confident paragraph spun from thin evidence.
"""

import enum

from pydantic import BaseModel


class ConfidenceLevel(enum.StrEnum):
    """How much an AI answer should be trusted given its evidence."""

    HIGH = "high"
    PARTIAL = "partial"
    LOW = "low"


HIGH_MIN_RELEVANT = 2
HIGH_MIN_RATIO = 0.5


def derive_confidence(consulted: int, relevant: int) -> ConfidenceLevel:
    """Map evidence counts onto a confidence band.

    LOW when nothing relevant was found, HIGH when several sources agree and
    they are a majority of what was consulted, PARTIAL in between. The bands are
    intentionally conservative: thin evidence never reads as HIGH.
    """
    if consulted <= 0 or relevant <= 0:
        return ConfidenceLevel.LOW
    ratio = relevant / consulted
    if relevant >= HIGH_MIN_RELEVANT and ratio >= HIGH_MIN_RATIO:
        return ConfidenceLevel.HIGH
    return ConfidenceLevel.PARTIAL


class Coverage(BaseModel):
    """What an AI answer actually looked at."""

    consulted: int
    relevant: int


class TrustSignal(BaseModel):
    """Coverage plus the confidence band derived from it."""

    coverage: Coverage
    confidence: ConfidenceLevel

    @classmethod
    def from_counts(cls, consulted: int, relevant: int) -> "TrustSignal":
        """Build a trust signal from raw evidence counts, deriving the band."""
        return cls(
            coverage=Coverage(consulted=consulted, relevant=relevant),
            confidence=derive_confidence(consulted, relevant),
        )
