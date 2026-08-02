/**
 * The document model behind the rich description editor.
 *
 * The editor shows a **marker-free** buffer: an H1 line reads "Ship it", not
 * "# Ship it". The markers live beside the text in `lead`, so the buffer the
 * user sees and the markdown we store are two different strings, and this
 * module is the only thing that converts between them.
 *
 * Two properties are load-bearing:
 *
 *  1. `toMarkdown(toLines(x)) === x` for arbitrary input. Descriptions are
 *     written on the web by TipTap, which emits grammar this editor does not
 *     model (tables, footnotes, h5/h6, html). Those lines are carried verbatim
 *     so opening a description on a phone can never rewrite it.
 *  2. `applyEdit` is pure. Caret arithmetic after a programmatic rewrite is
 *     where editors like this go wrong, and a pure reducer can be tested
 *     exhaustively without a simulator.
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
 * What a line shows in front of its text.
 *
 * A heading's marker is eaten outright — the type size already says it is a
 * heading. A bullet's is not: with the marker gone and no way to draw a gutter
 * inside a single TextInput, a bullet would be indistinguishable from body
 * text. It is swapped for a real bullet glyph instead, and the swap is
 * **length-preserving**, so display offsets and markdown offsets stay aligned
 * and the caret needs no correction on those lines.
 */
export function displayLead(line: EditorLine): string {
  switch (line.kind.type) {
    case "heading":
    case "quote":
      return ""
    case "bullet":
      return line.lead.replace(/[-*+]/, "\u2022")
    default:
      return line.lead
  }
}

/** The string the TextInput displays. */
export function toDisplay(lines: EditorLine[]): string {
  return lines.map((l) => `${displayLead(l)}${l.text}`).join("\n")
}

/**
 * Where the caret lands after a single contiguous edit.
 *
 * `onChangeText` does not report the caret and `onSelectionChange` races with
 * it, so it is derived: the edit begins where the two strings diverge, and an
 * insertion pushes the caret past what was inserted.
 */
export function caretAfterEdit(oldDisplay: string, nextDisplay: string): number {
  let prefix = 0
  while (
    prefix < oldDisplay.length &&
    prefix < nextDisplay.length &&
    oldDisplay[prefix] === nextDisplay[prefix]
  ) {
    prefix += 1
  }
  return prefix + Math.max(0, nextDisplay.length - oldDisplay.length)
}

/** How many characters this line occupies in the visible buffer. */
function displayLength(line: EditorLine): number {
  return displayLead(line).length + line.text.length
}

/**
 * Input rules, applied to the caret's line only. Returns the rewritten line;
 * the caller works out the caret shift from how the *display* length changed,
 * which is not the same as the markdown length: eating "# " shortens the line
 * by two, but swapping "- " for a bullet glyph does not shorten it at all.
 */
function applyInputRule(line: EditorLine): EditorLine | null {
  // Inside a fence "# x" is code, and a raw line is not ours to reinterpret.
  if (line.kind.type === "code" || line.kind.type === "raw") return null
  // Only an unstyled line converts; otherwise typing "# " inside a heading
  // would stack markers.
  if (line.lead.length > 0) return null

  const heading = /^(#{1,6})[ \t](.*)$/.exec(line.text)
  if (heading) {
    const hashes = heading[1] ?? "#"
    return {
      lead: `${hashes} `,
      text: heading[2] ?? "",
      kind: { type: "heading", level: hashes.length as 1 },
    }
  }

  const bullet = /^([-*+])[ \t](.*)$/.exec(line.text)
  if (bullet) {
    return { lead: "- ", text: bullet[2] ?? "", kind: { type: "bullet", indent: 0 } }
  }

  const ordered = /^(\d{1,9}[.)])[ \t](.*)$/.exec(line.text)
  if (ordered) {
    const marker = ordered[1] ?? "1."
    return {
      lead: `${marker} `,
      text: ordered[2] ?? "",
      kind: { type: "ordered", indent: 0, marker },
    }
  }

  const quote = /^>[ \t](.*)$/.exec(line.text)
  if (quote) {
    return { lead: "> ", text: quote[1] ?? "", kind: { type: "quote" } }
  }

  return null
}

/** What a fresh line started from `previous` should be. */
function continuationOf(previous: EditorLine | undefined): EditorLine {
  const plain: EditorLine = { lead: "", text: "", kind: { type: "paragraph" } }
  if (!previous) return plain
  // A list continues; a heading or quote does not — pressing Enter after a
  // title should give you body text, which is what every editor does.
  if (previous.kind.type === "bullet") {
    return { lead: previous.lead, text: "", kind: previous.kind }
  }
  if (previous.kind.type === "ordered") {
    const next = Number.parseInt(previous.kind.marker, 10)
    const suffix = previous.kind.marker.slice(-1)
    const marker = Number.isFinite(next) ? `${next + 1}${suffix}` : previous.kind.marker
    return {
      lead: `${" ".repeat(previous.kind.indent)}${marker} `,
      text: "",
      kind: { ...previous.kind, marker },
    }
  }
  return plain
}

export interface EditResult {
  lines: EditorLine[]
  /** Caret offset within the *display* string. */
  caret: number
}

/**
 * Fold a raw TextInput change into the document.
 *
 * `nextDisplay` is the marker-free buffer the native input now holds and
 * `caret` is the offset within it. Lines outside the edited span keep their
 * kind by identity, so typing in one paragraph cannot restyle a heading
 * elsewhere in the document.
 */
export function applyEdit(before: EditorLine[], nextDisplay: string, caret: number): EditResult {
  const oldText = before.map((l) => `${displayLead(l)}${l.text}`)
  const newText = nextDisplay.split("\n")

  // Unchanged head and tail, so an edit is attributed to as few lines as
  // possible and everything else keeps its kind.
  let head = 0
  while (head < oldText.length && head < newText.length && oldText[head] === newText[head]) {
    head += 1
  }
  let tail = 0
  while (
    tail < oldText.length - head &&
    tail < newText.length - head &&
    oldText[oldText.length - 1 - tail] === newText[newText.length - 1 - tail]
  ) {
    tail += 1
  }

  const lines: EditorLine[] = []
  for (let i = 0; i < head; i += 1) lines.push(before[i] as EditorLine)

  const oldMiddle = before.slice(head, before.length - tail)
  const newMiddle = newText.slice(head, newText.length - tail)
  for (let i = 0; i < newMiddle.length; i += 1) {
    const text = newMiddle[i] ?? ""
    const existing = oldMiddle[i]
    if (existing) {
      const shown = displayLead(existing)
      if (shown.length === 0) {
        lines.push({ ...existing, text })
      } else if (text.startsWith(shown)) {
        // Same slot, glyph intact: only the content changed.
        lines.push({ ...existing, text: text.slice(shown.length) })
      } else {
        // The user deleted into the bullet glyph. Backspacing a bullet away
        // should un-bullet the line, not resurrect the glyph underneath them.
        lines.push({ lead: "", text, kind: { type: "paragraph" } })
      }
    } else {
      // A line that did not exist before — Enter, or a paste. It inherits the
      // list it was split out of and nothing else.
      const previous = lines[lines.length - 1]
      const fresh = continuationOf(previous)
      lines.push({ ...fresh, text })
    }
  }

  for (let i = before.length - tail; i < before.length; i += 1) {
    lines.push(before[i] as EditorLine)
  }

  // Which display line is the caret on, and how far into it?
  let offset = 0
  let caretLine = 0
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as EditorLine
    const length = displayLead(line).length + line.text.length
    if (caret <= offset + length) {
      caretLine = i
      break
    }
    offset += length + 1
    caretLine = i
  }

  const target = lines[caretLine]
  if (target) {
    const converted = applyInputRule(target)
    if (converted) {
      lines[caretLine] = converted
      const removed = displayLength(target) - displayLength(converted)
      return { lines, caret: Math.max(offset, caret - removed) }
    }
  }

  return { lines, caret }
}
