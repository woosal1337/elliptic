import { applyEdit, toDisplay, toLines, toMarkdown, type EditorLine } from "./markdownEditor"

const WEB_AUTHORED = `# Heading one

## Heading two

#### Heading four

A paragraph with **bold** and \`code\`.

- bullet one
- bullet two
  - nested bullet

1. ordered one
2. ordered two

> A blockquote.

\`\`\`python
# not a heading
- not a bullet
\`\`\`

---

| a | b |
| - | - |

Trailing paragraph.
`

/** Type `text` one character at a time at `caret`, as the keyboard would. */
function type(lines: EditorLine[], caret: number, text: string) {
  let state = { lines, caret }
  for (const ch of text) {
    const display = toDisplay(state.lines)
    const next = display.slice(0, state.caret) + ch + display.slice(state.caret)
    state = applyEdit(state.lines, next, state.caret + 1)
  }
  return state
}

describe("round trip", () => {
  it("reproduces web-authored markdown byte for byte", () => {
    expect(toMarkdown(toLines(WEB_AUTHORED))).toBe(WEB_AUTHORED)
  })

  it.each([
    ["empty", ""],
    ["trailing newlines", "a\n\n\n"],
    ["no trailing newline", "a"],
    ["tab bullet", "\t- x"],
    ["unclosed fence", "```\nx"],
    ["markdown inside a fence", "```\n# x\n- y\n```"],
    ["table", "| a |\n| - |"],
    ["html", "<div>\nx\n</div>"],
    ["rule", "---"],
    ["h6", "###### six"],
    ["ordered paren", "1) one"],
    ["quote tight", ">tight"],
    ["footnote", "[^1]: note"],
  ])("preserves %s", (_name, input) => {
    expect(toMarkdown(toLines(input))).toBe(input)
  })

  it("eats heading and quote markers but shows a glyph for list items", () => {
    // A heading is legible from its type size; a bullet with nothing in front
    // of it would be indistinguishable from body text.
    const display = toDisplay(toLines("# Title\n- item\n> quote\n1. first"))
    expect(display).toBe("Title\n\u2022 item\nquote\n1. first")
  })
})

describe("input rules", () => {
  it("turns '# ' into a heading and eats the marker", () => {
    const start = toLines("")
    const after = type(start, 0, "# Ship it")
    expect(toDisplay(after.lines)).toBe("Ship it")
    expect(toMarkdown(after.lines)).toBe("# Ship it")
    expect(after.lines[0]?.kind).toEqual({ type: "heading", level: 1 })
  })

  it.each([
    ["## ", 2, "## "],
    ["### ", 3, "### "],
    ["#### ", 4, "#### "],
  ])("supports %s", (typed, level, lead) => {
    const after = type(toLines(""), 0, `${typed}Title`)
    expect(toDisplay(after.lines)).toBe("Title")
    expect(after.lines[0]?.lead).toBe(lead)
    expect(after.lines[0]?.kind).toEqual({ type: "heading", level })
  })

  it("turns '- ' into a bullet", () => {
    const after = type(toLines(""), 0, "- milk")
    expect(toDisplay(after.lines)).toBe("\u2022 milk")
    expect(toMarkdown(after.lines)).toBe("- milk")
  })

  it("does not move the caret when the marker swap is length-preserving", () => {
    // "- " becomes "\u2022 ": same width, so the caret must stay put or the
    // next keystroke lands in front of the bullet.
    const after = type(toLines(""), 0, "- ")
    expect(after.caret).toBe(2)
    expect(toDisplay(after.lines)).toBe("\u2022 ")
  })

  it("turns '1. ' into an ordered item", () => {
    const after = type(toLines(""), 0, "1. first")
    expect(toDisplay(after.lines)).toBe("1. first")
    expect(toMarkdown(after.lines)).toBe("1. first")
    expect(after.lines[0]?.kind).toMatchObject({ type: "ordered" })
  })

  it("turns '> ' into a quote", () => {
    const after = type(toLines(""), 0, "> quoted")
    expect(toDisplay(after.lines)).toBe("quoted")
    expect(toMarkdown(after.lines)).toBe("> quoted")
  })

  it("leaves the caret where the user is typing", () => {
    // "# " is eaten, so after typing 5 chars the caret sits after "Sh".
    const after = type(toLines(""), 0, "# Sh")
    expect(after.caret).toBe(2)
    expect(toDisplay(after.lines)).toBe("Sh")
  })

  it("does not stack markers when typing '# ' inside an existing heading", () => {
    const heading = toLines("# Title")
    // Caret at the very start of the visible text, then type "# ".
    const after = type(heading, 0, "# ")
    expect(toMarkdown(after.lines)).toBe("# # Title")
    expect(after.lines).toHaveLength(1)
  })

  it("does not fire inside a fenced code block", () => {
    const lines = toLines("```\n\n```")
    // The blank line inside the fence is display index 1.
    const after = type(lines, toDisplay(lines).indexOf("\n") + 1, "# x")
    expect(toMarkdown(after.lines)).toBe("```\n# x\n```")
    expect(after.lines[1]?.kind).toEqual({ type: "code" })
  })

  it("requires the space — '#' alone is still a paragraph", () => {
    const after = type(toLines(""), 0, "#")
    expect(toDisplay(after.lines)).toBe("#")
    expect(after.lines[0]?.kind).toEqual({ type: "paragraph" })
  })
})

describe("splitting lines", () => {
  const enter = (lines: EditorLine[], caret: number) => {
    const display = toDisplay(lines)
    return applyEdit(lines, `${display.slice(0, caret)}\n${display.slice(caret)}`, caret + 1)
  }

  it("continues a bullet list", () => {
    const lines = toLines("- milk")
    const after = enter(lines, toDisplay(lines).length)
    expect(after.lines[1]?.kind.type).toBe("bullet")
    expect(toMarkdown(after.lines)).toBe("- milk\n- ")
  })

  it("increments an ordered list", () => {
    const lines = toLines("1. first")
    const after = enter(lines, toDisplay(lines).length)
    expect(toMarkdown(after.lines)).toBe("1. first\n2. ")
  })

  it("drops out of a heading into body text", () => {
    const lines = toLines("# Title")
    const after = enter(lines, toDisplay(lines).length)
    expect(after.lines[1]?.kind).toEqual({ type: "paragraph" })
    expect(toMarkdown(after.lines)).toBe("# Title\n")
  })
})

describe("kind stability", () => {
  it("editing one line does not restyle another", () => {
    const lines = toLines("# Title\n\nbody\n\n- item")
    const display = toDisplay(lines)
    const at = display.indexOf("body") + 4
    const after = applyEdit(lines, `${display.slice(0, at)} more${display.slice(at)}`, at + 5)
    expect(after.lines.map((l) => l.kind.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "paragraph",
      "bullet",
    ])
    expect(toMarkdown(after.lines)).toBe("# Title\n\nbody more\n\n- item")
  })

  it("keeps unmodelled lines untouched while editing around them", () => {
    const lines = toLines("| a | b |\n\ntext")
    const display = toDisplay(lines)
    const after = applyEdit(lines, `${display}!`, display.length + 1)
    expect(toMarkdown(after.lines)).toBe("| a | b |\n\ntext!")
    expect(after.lines[0]?.kind).toEqual({ type: "raw" })
  })

  it("survives deleting an entire line", () => {
    const lines = toLines("# Title\nbody\n- item")
    // Drop the middle line, leaving the heading and the bullet either side.
    const after = applyEdit(lines, "Title\n\u2022 item", 5)
    expect(toMarkdown(after.lines)).toBe("# Title\n- item")
  })

  it("un-bullets a line when the glyph itself is deleted", () => {
    const lines = toLines("- item")
    // Backspace over the bullet glyph.
    const after = applyEdit(lines, " item", 0)
    expect(toMarkdown(after.lines)).toBe(" item")
    expect(after.lines[0]?.kind).toEqual({ type: "paragraph" })
  })

  it("round-trips after an edit that touches nothing", () => {
    const lines = toLines(WEB_AUTHORED)
    const after = applyEdit(lines, toDisplay(lines), 0)
    expect(toMarkdown(after.lines)).toBe(WEB_AUTHORED)
  })
})
