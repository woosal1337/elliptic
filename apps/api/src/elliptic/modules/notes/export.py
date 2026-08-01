"""Minimal, dependency-free Markdown -> HTML rendering for page export (COS-130)."""

import html
import re

_BOLD = re.compile(r"\*\*(.+?)\*\*")
_ITALIC = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")
_CODE = re.compile(r"`(.+?)`")
_LINK = re.compile(r"\[(.+?)\]\((.+?)\)")


def _inline(text: str) -> str:
    """Escape, then apply inline markdown (bold/italic/code/link)."""
    out = html.escape(text)
    out = _CODE.sub(r"<code>\1</code>", out)
    out = _BOLD.sub(r"<strong>\1</strong>", out)
    out = _ITALIC.sub(r"<em>\1</em>", out)
    return _LINK.sub(r'<a href="\2">\1</a>', out)


def markdown_to_html(content: str) -> str:  # noqa: PLR0915
    """Render a small, safe subset of Markdown (headings, lists, code fences, paragraphs)."""
    lines = content.replace("\r\n", "\n").split("\n")
    parts: list[str] = []
    in_list = False
    in_code = False
    para: list[str] = []

    def flush_para() -> None:
        if para:
            parts.append(f"<p>{_inline(' '.join(para))}</p>")
            para.clear()

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            parts.append("</ul>")
            in_list = False

    for raw in lines:
        if raw.strip().startswith("```"):
            flush_para()
            close_list()
            if in_code:
                parts.append("</pre>")
                in_code = False
            else:
                parts.append("<pre>")
                in_code = True
            continue
        if in_code:
            parts.append(html.escape(raw))
            continue
        line = raw.rstrip()
        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        if heading:
            flush_para()
            close_list()
            level = len(heading.group(1))
            parts.append(f"<h{level}>{_inline(heading.group(2))}</h{level}>")
            continue
        bullet = re.match(r"^\s*[-*]\s+(.*)$", line)
        if bullet:
            flush_para()
            if not in_list:
                parts.append("<ul>")
                in_list = True
            parts.append(f"<li>{_inline(bullet.group(1))}</li>")
            continue
        if not line.strip():
            flush_para()
            close_list()
            continue
        para.append(line.strip())

    flush_para()
    close_list()
    if in_code:
        parts.append("</pre>")
    return "\n".join(parts)


def note_to_html_document(title: str, content: str) -> str:
    """A standalone styled HTML document (opens in Word as .doc; printable to PDF)."""
    body = markdown_to_html(content)
    safe_title = html.escape(title)
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{safe_title}</title>"
        "<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:48rem;"
        "margin:2rem auto;line-height:1.6;color:#1a1a1a;padding:0 1rem}"
        "h1,h2,h3{line-height:1.25}code{background:#f3f3f3;padding:.1em .3em;border-radius:3px}"
        "pre{background:#f6f6f6;padding:1rem;border-radius:6px;overflow:auto}"
        "a{color:#2563eb}</style></head><body>"
        f"<h1>{safe_title}</h1>{body}</body></html>"
    )
