"""Shared content tokenization for keyword-overlap heuristics."""

import re

STOPWORDS = frozenset(
    {
        "the",
        "and",
        "for",
        "are",
        "was",
        "with",
        "this",
        "that",
        "from",
        "have",
        "has",
        "had",
        "will",
        "your",
        "you",
        "our",
        "their",
        "they",
        "them",
        "but",
        "not",
        "all",
        "can",
        "any",
        "out",
        "use",
        "via",
        "per",
        "into",
        "over",
        "what",
        "when",
        "who",
        "how",
        "why",
        "its",
        "his",
        "her",
        "about",
        "after",
        "before",
        "team",
        "task",
        "tasks",
        "meeting",
        "note",
        "notes",
        "project",
    }
)
_TOKEN_RE = re.compile(r"[a-z0-9]+")
_MIN_TOKEN_LEN = 2
_TEXT_CAP = 4000


def content_tokens(*parts: str | None) -> set[str]:
    """Lowercase content tokens, dropping stopwords and very short words."""
    text = " ".join(part for part in parts if part)[:_TEXT_CAP].lower()
    return {
        word
        for word in _TOKEN_RE.findall(text)
        if len(word) > _MIN_TOKEN_LEN and word not in STOPWORDS
    }


def token_overlap(left: set[str], right: set[str]) -> int:
    """Number of shared tokens between two token sets."""
    return len(left & right)
