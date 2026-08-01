"""External embed provider registry — maps URLs to embeddable metadata (COS-149)."""

import re
from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderMatch:
    provider: str
    kind: str
    iframe_url: str | None = None


def _youtube(url: str, m: re.Match[str]) -> ProviderMatch:  # noqa: ARG001
    return ProviderMatch("youtube", "iframe", f"https://www.youtube.com/embed/{m.group('id')}")


def _loom(url: str, m: re.Match[str]) -> ProviderMatch:  # noqa: ARG001
    return ProviderMatch("loom", "iframe", f"https://www.loom.com/embed/{m.group('id')}")


def _figma(url: str, m: re.Match[str]) -> ProviderMatch:  # noqa: ARG001
    from urllib.parse import quote  # noqa: PLC0415

    return ProviderMatch(
        "figma",
        "iframe",
        f"https://www.figma.com/embed?embed_host=companyos&url={quote(url, safe='')}",
    )


def _vimeo(url: str, m: re.Match[str]) -> ProviderMatch:  # noqa: ARG001
    return ProviderMatch("vimeo", "iframe", f"https://player.vimeo.com/video/{m.group('id')}")


_Builder = Callable[[str, re.Match[str]], ProviderMatch]
_PROVIDERS: list[tuple[re.Pattern[str], _Builder]] = [
    (re.compile(r"(?:youtube\.com/watch\?v=|youtu\.be/)(?P<id>[\w-]{11})"), _youtube),
    (re.compile(r"loom\.com/(?:share|embed)/(?P<id>[\w-]+)"), _loom),
    (re.compile(r"vimeo\.com/(?P<id>\d+)"), _vimeo),
    (re.compile(r"figma\.com/(?:file|design|proto)/"), _figma),
]

_LINK_PROVIDERS = {
    "docs.google.com": "google",
    "airtable.com": "airtable",
    "notion.so": "notion",
    "github.com": "github",
}


def match_provider(url: str) -> ProviderMatch | None:
    for pattern, builder in _PROVIDERS:
        m = pattern.search(url)
        if m:
            return builder(url, m)
    for host, name in _LINK_PROVIDERS.items():
        if host in url:
            return ProviderMatch(name, "link")
    return None
