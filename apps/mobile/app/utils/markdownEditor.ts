/**
 * The document model behind the description editor.
 *
 * The editor buffer **is** the markdown: what the user types is what gets
 * stored, character for character. Each line is split into its marker (`lead`)
 * and its content (`text`) purely so the two can be drawn differently — the
 * marker dimmed, the content in the type its line deserves.
 *
 * Nothing here rewrites the buffer, and that is the whole design. An earlier
 * version stripped markers as you typed, which meant the model and the native
 * text drifted apart: React Native's TextInput will restyle its children but
 * will not let JS delete characters out from under the keyboard, so a heading
 * came out correctly styled with its "# " still sitting there. Re-deriving the
 * line kinds from the text on every change cannot drift, needs no caret
 * arithmetic, and round-trips byte for byte.
 *
 * `toMarkdown(toLines(x)) === x` for arbitrary input — including the grammar
 * this parser does not model (tables, footnotes, html), which rides through
 * verbatim so opening a web-authored description on a phone cannot rewrite it.
 */

export type LineKind =
  | { type: "paragraph" }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: "bullet"; indent: number }
  | { type: "ordered"; indent: number; marker: string }
  | { type: "quote" }
  /** A fence line or its contents. Input rules never fire inside one. */
  | { type: "code" }
  /** Grammar we do not model. Never rewritten, never edited into. */
  | { type: "raw" }

export interface EditorLine {
  /** Markdown prefix, absent from the visible buffer. */
  lead: string
  /** What the user sees and edits on this line. */
  text: string
  kind: LineKind
}

const HEADING = /^((#{1,6})[ \t]+)(.*)$/
const BULLET = /^(([ \t]*)[-*+][ \t]+)(.*)$/
const ORDERED = /^(([ \t]*)(\d{1,9}[.)])[ \t]+)(.*)$/
const QUOTE = /^(>[ \t]?)(.*)$/
const FENCE = /^[ \t]*(```|~~~)/
const RULE = /^[ \t]*((?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/
const RAW_HINT = /^[ \t]*(\||<[a-zA-Z/!]|\[\^)/

function indentWidth(prefix: string): number {
  let width = 0
  for (const ch of prefix) width += ch === "\t" ? 4 : 1
  return width
}

/** Split markdown into one editor line per source line. */
export function toLines(source: string): EditorLine[] {
  const raw = (line: string): EditorLine => ({ lead: "", text: line, kind: { type: "raw" } })
  const out: EditorLine[] = []
  let inFence = false

  for (const line of source.split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence
      out.push({ lead: "", text: line, kind: { type: "code" } })
      continue
    }
    if (inFence) {
      out.push({ lead: "", text: line, kind: { type: "code" } })
      continue
    }
    // A rule and a table row are content, not markers — carrying them as raw
    // keeps "---" from being read as a bullet whose text is "-".
    if (RULE.test(line) || RAW_HINT.test(line)) {
      out.push(raw(line))
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      out.push({
        lead: heading[1] ?? "# ",
        text: heading[3] ?? "",
        kind: { type: "heading", level: (heading[2] ?? "#").length as 1 },
      })
      continue
    }
    const quote = QUOTE.exec(line)
    if (quote) {
      out.push({ lead: quote[1] ?? "> ", text: quote[2] ?? "", kind: { type: "quote" } })
      continue
    }
    const ordered = ORDERED.exec(line)
    if (ordered) {
      out.push({
        lead: ordered[1] ?? "1. ",
        text: ordered[4] ?? "",
        kind: {
          type: "ordered",
          indent: indentWidth(ordered[2] ?? ""),
          marker: ordered[3] ?? "1.",
        },
      })
      continue
    }
    const bullet = BULLET.exec(line)
    if (bullet) {
      out.push({
        lead: bullet[1] ?? "- ",
        text: bullet[3] ?? "",
        kind: { type: "bullet", indent: indentWidth(bullet[2] ?? "") },
      })
      continue
    }
    out.push({ lead: "", text: line, kind: { type: "paragraph" } })
  }

  return out
}

/** The markdown to persist. Inverse of {@link toLines}. */
export function toMarkdown(lines: EditorLine[]): string {
  return lines.map((l) => `${l.lead}${l.text}`).join("\n")
}

/**
 * What the TextInput displays — identical to the markdown, by design.
 * Kept as its own name so call sites read as intent rather than coincidence.
 */
export const toDisplay = toMarkdown
