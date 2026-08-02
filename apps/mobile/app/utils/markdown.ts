/**
 * Block and inline parsing for the markdown we store in task descriptions and
 * notes.
 *
 * The web writes these strings with TipTap + tiptap-markdown, whose StarterKit
 * emits far more than the mobile renderer used to model: headings 1-4, ordered
 * lists, blockquotes, fenced code, italics, strikethrough and horizontal rules
 * all round-trip through the same `description` column. Mobile rendered every
 * one of those as literal source text.
 *
 * The rule that matters here is **never lose the user's text**. Anything this
 * parser does not model becomes a `raw` block holding its exact source lines,
 * so `serializeBlocks(parseBlocks(x)) === x` holds for arbitrary input, not
 * just for the grammar we happen to understand. An editor built on top can
 * then edit what it knows and leave the rest untouched rather than silently
 * rewriting somebody's table into nothing.
 */

/**
 * `lead` is the block's literal prefix — indent, marker and trailing spaces
 * exactly as written. Serialising re-emits it rather than reconstructing one,
 * because reconstructing normalises: a tab indent comes back as spaces and
 * ">tight" comes back as "> tight". Both are text the user did not type.
 */
export type Block =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; lead: string; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; indent: number; lead: string; text: string }
  | { kind: "ordered"; indent: number; marker: string; lead: string; text: string }
  | { kind: "quote"; lead: string; text: string }
  | { kind: "code"; fence: string; lang: string; lines: string[]; closed: boolean }
  | { kind: "rule"; text: string }
  | {
      kind: "table"
      /** Source lines, re-emitted verbatim so the round trip stays exact. */
      lines: string[]
      header: string[]
      rows: string[][]
      align: ("left" | "center" | "right")[]
    }
  | { kind: "blank" }
  /** Anything unmodelled — preserved verbatim so a round trip cannot lose it. */
  | { kind: "raw"; text: string }

const HEADING = /^((#{1,6})[ \t]+)(.*)$/
const BULLET = /^(([ \t]*)[-*+][ \t]+)(.*)$/
const ORDERED = /^(([ \t]*)(\d{1,9}[.)])[ \t]+)(.*)$/
const QUOTE = /^(>[ \t]?)(.*)$/
const FENCE = /^([ \t]*)(```|~~~)[ \t]*(\S*)[ \t]*$/
const RULE = /^[ \t]*((?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/
/** An HTML block or a footnote — modelled as raw, never rewritten. */
const RAW_HINT = /^[ \t]*(<[a-zA-Z/!]|\[\^)/
const TABLE_ROW = /^[ \t]*\|.*\|[ \t]*$/
/** The `|---|:--:|` line under a table's header. Its dashes set alignment. */
const TABLE_DIVIDER = /^[ \t]*\|(?:[ \t]*:?-+:?[ \t]*\|)+[ \t]*$/

/** Split "| a | b |" into its cells, dropping the outer pipes. */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

/** Width of a leading indent, counting a tab as four columns. */
function indentWidth(prefix: string): number {
  let width = 0
  for (const ch of prefix) width += ch === "\t" ? 4 : 1
  return width
}

export function parseBlocks(source: string): Block[] {
  const lines = source.split("\n")
  const blocks: Block[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ""

    // Fenced code swallows everything to its closing fence. Checked first:
    // inside a fence, "# x" is code, not a heading.
    const fence = FENCE.exec(line)
    if (fence) {
      const marker = fence[2] ?? "```"
      const body: string[] = []
      let closed = false
      let j = i + 1
      for (; j < lines.length; j += 1) {
        const candidate = lines[j] ?? ""
        if (candidate.trimStart().startsWith(marker)) {
          closed = true
          break
        }
        body.push(candidate)
      }
      blocks.push({ kind: "code", fence: marker, lang: fence[3] ?? "", lines: body, closed })
      // An unclosed fence ends the document; consuming to `j` is right either way.
      i = closed ? j : lines.length
      continue
    }

    if (line.trim().length === 0) {
      blocks.push({ kind: "blank" })
      continue
    }

    // A table is a header row, a divider, then rows until the pipes stop. It
    // has to be recognised as a unit — a lone "| a | b |" is just a paragraph.
    if (TABLE_ROW.test(line) && TABLE_DIVIDER.test(lines[i + 1] ?? "")) {
      const source = [line, lines[i + 1] ?? ""]
      const rows: string[][] = []
      let j = i + 2
      for (; j < lines.length; j += 1) {
        const row = lines[j] ?? ""
        if (!TABLE_ROW.test(row)) break
        source.push(row)
        rows.push(tableCells(row))
      }
      const align = tableCells(source[1] ?? "").map((spec) => {
        const left = spec.startsWith(":")
        const right = spec.endsWith(":")
        return right && left ? "center" : right ? "right" : "left"
      }) as ("left" | "center" | "right")[]
      blocks.push({ kind: "table", lines: source, header: tableCells(line), rows, align })
      i = j - 1
      continue
    }

    // A rule must be tested before a bullet: "---" also matches nothing else,
    // but "- - -" would otherwise read as a bullet containing "- -".
    const rule = RULE.exec(line)
    if (rule) {
      blocks.push({ kind: "rule", text: line })
      continue
    }

    if (RAW_HINT.test(line)) {
      blocks.push({ kind: "raw", text: line })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const level = (heading[2] ?? "#").length as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push({ kind: "heading", level, lead: heading[1] ?? "# ", text: heading[3] ?? "" })
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      blocks.push({ kind: "quote", lead: quote[1] ?? "> ", text: quote[2] ?? "" })
      continue
    }

    const ordered = ORDERED.exec(line)
    if (ordered) {
      blocks.push({
        kind: "ordered",
        indent: indentWidth(ordered[2] ?? ""),
        marker: ordered[3] ?? "1.",
        lead: ordered[1] ?? "1. ",
        text: ordered[4] ?? "",
      })
      continue
    }

    const bullet = BULLET.exec(line)
    if (bullet) {
      blocks.push({
        kind: "bullet",
        indent: indentWidth(bullet[2] ?? ""),
        lead: bullet[1] ?? "- ",
        text: bullet[3] ?? "",
      })
      continue
    }

    blocks.push({ kind: "paragraph", text: line })
  }

  return blocks
}

/** The inverse of {@link parseBlocks}. Must reproduce the source byte for byte. */
export function serializeBlocks(blocks: Block[]): string {
  const lines: string[] = []
  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        lines.push(`${block.lead}${block.text}`)
        break
      case "paragraph":
      case "raw":
      case "rule":
        lines.push(block.text)
        break
      case "bullet":
      case "ordered":
      case "quote":
        lines.push(`${block.lead}${block.text}`)
        break
      case "table":
        lines.push(...block.lines)
        break
      case "code":
        lines.push(`${block.fence}${block.lang}`)
        lines.push(...block.lines)
        if (block.closed) lines.push(block.fence)
        break
      case "blank":
        lines.push("")
        break
    }
  }
  return lines.join("\n")
}

export type Span =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "boldItalic"; text: string }
  | { kind: "strike"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string }

// Ordered longest-marker-first so *** wins over ** wins over *.
const INLINE =
  /(\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]\n]*\]\([^)\s]*\))/

/** Only these schemes are followed; anything else renders as inert text. */
function safeHref(href: string): boolean {
  return href.startsWith("/") || /^(https?:\/\/|mailto:)/i.test(href)
}

export function parseInline(text: string): Span[] {
  const spans: Span[] = []
  let rest = text

  while (rest.length > 0) {
    const match = INLINE.exec(rest)
    if (!match || match.index === undefined) break

    if (match.index > 0) spans.push({ kind: "text", text: rest.slice(0, match.index) })
    const token = match[0]

    if (token.startsWith("***") || token.startsWith("___")) {
      spans.push({ kind: "boldItalic", text: token.slice(3, -3) })
    } else if (token.startsWith("**") || token.startsWith("__")) {
      spans.push({ kind: "bold", text: token.slice(2, -2) })
    } else if (token.startsWith("~~")) {
      spans.push({ kind: "strike", text: token.slice(2, -2) })
    } else if (token.startsWith("`")) {
      spans.push({ kind: "code", text: token.slice(1, -1) })
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]*)\]\(([^)\s]*)\)$/.exec(token)
      if (link && safeHref(link[2] ?? "")) {
        spans.push({ kind: "link", text: link[1] ?? "", href: link[2] ?? "" })
      } else {
        // An unsafe or malformed link stays visible as its own source rather
        // than disappearing.
        spans.push({ kind: "text", text: token })
      }
    } else {
      spans.push({ kind: "italic", text: token.slice(1, -1) })
    }

    rest = rest.slice(match.index + token.length)
  }

  if (rest.length > 0) spans.push({ kind: "text", text: rest })

  const merged: Span[] = []
  for (const span of spans) {
    const previous = merged[merged.length - 1]
    if (span.kind === "text" && previous?.kind === "text") previous.text += span.text
    else merged.push(span)
  }
  return merged
}
