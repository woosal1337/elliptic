import { toDisplay, toLines, toMarkdown } from "./markdownEditor"

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

  it("shows the buffer exactly as typed — the display IS the markdown", () => {
    // The editor never rewrites the text. That is what keeps the model and the
    // native input from drifting apart, and what makes the round trip exact.
    const source = "# Title\n- item\n> quote\n1. first"
    expect(toDisplay(toLines(source))).toBe(source)
    expect(toDisplay(toLines(source))).toBe(toMarkdown(toLines(source)))
  })

  it("splits each line into a marker and its content, for styling", () => {
    const lines = toLines("## Heading\n- item\n> quote")
    expect(lines.map((l) => [l.lead, l.text, l.kind.type])).toEqual([
      ["## ", "Heading", "heading"],
      ["- ", "item", "bullet"],
      ["> ", "quote", "quote"],
    ])
  })

  it("classifies every line kind the renderer styles", () => {
    const kinds = toLines("# h\ntext\n- b\n1. o\n> q\n```\ncode\n```\n| t |").map(
      (l) => l.kind.type
    )
    expect(kinds).toEqual([
      "heading",
      "paragraph",
      "bullet",
      "ordered",
      "quote",
      "code",
      "code",
      "code",
      "raw",
    ])
  })
})
