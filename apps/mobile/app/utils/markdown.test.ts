import { parseBlocks, parseInline, serializeBlocks, type Block } from "./markdown"

/** The grammar the web's TipTap editor can write into a description. */
const WEB_AUTHORED = `# Heading one

## Heading two

### Heading three

#### Heading four

A paragraph with **bold**, *italic*, ***both***, ~~strikethrough~~, \`inline code\`,
and a [link](https://elliptic.sh).

- bullet one
- bullet two
  - nested bullet
- bullet three

1. ordered one
2. ordered two
3. ordered three

> A blockquote.
> Spanning two lines.

\`\`\`python
def round_trip(md: str) -> str:
    return md  # this had better be true
\`\`\`

---

Trailing paragraph after a horizontal rule.
`

describe("round trip", () => {
  it("reproduces web-authored markdown byte for byte", () => {
    expect(serializeBlocks(parseBlocks(WEB_AUTHORED))).toBe(WEB_AUTHORED)
  })

  // Losing a user's text is the only unrecoverable failure this module has, so
  // the property is asserted against awkward input rather than tidy examples.
  it.each([
    ["empty", ""],
    ["single newline", "\n"],
    ["trailing newlines", "text\n\n\n"],
    ["no trailing newline", "text"],
    ["windows-ish blank lines", "a\n\nb"],
    ["tab-indented bullet", "\t- tabbed"],
    ["unclosed fence", "```js\nconst a = 1\n"],
    ["fence containing markdown", "```\n# not a heading\n- not a bullet\n```"],
    ["setext-ish underline", "Title\n===="],
    ["html block", "<div class='x'>\nhi\n</div>"],
    ["table", "| a | b |\n| - | - |\n| 1 | 2 |"],
    ["footnote", "text[^1]\n\n[^1]: the note"],
    ["ordered with paren", "1) one\n2) two"],
    ["deep nesting", "- a\n  - b\n    - c\n      - d"],
    ["heading with trailing hashes", "## Heading ##"],
    ["six hashes", "###### six"],
    ["seven hashes is not a heading", "####### seven"],
    ["rule variants", "---\n***\n___"],
    ["quote with no space", ">tight"],
    ["bare asterisk", "5 * 3 = 15"],
    ["unclosed bold", "**not closed"],
    ["url with underscores", "see http://x.test/a_b_c here"],
  ])("preserves %s", (_name, input) => {
    expect(serializeBlocks(parseBlocks(input))).toBe(input)
  })
})

describe("parseBlocks", () => {
  const kinds = (src: string): Block["kind"][] => parseBlocks(src).map((b) => b.kind)

  it("reads every heading level", () => {
    for (let level = 1; level <= 6; level += 1) {
      const [block] = parseBlocks(`${"#".repeat(level)} title`)
      expect(block).toEqual({
        kind: "heading",
        level,
        lead: `${"#".repeat(level)} `,
        text: "title",
      })
    }
  })

  it("does not treat seven hashes as a heading", () => {
    expect(kinds("####### seven")).toEqual(["paragraph"])
  })

  it("requires a space after the hashes", () => {
    expect(kinds("#nospace")).toEqual(["paragraph"])
  })

  it("keeps fenced code verbatim, including markdown inside it", () => {
    const [block] = parseBlocks("```js\n# heading\n- bullet\n```")
    expect(block).toMatchObject({
      kind: "code",
      lang: "js",
      lines: ["# heading", "- bullet"],
      closed: true,
    })
  })

  it("marks an unclosed fence so serialising does not invent a closer", () => {
    const [block] = parseBlocks("```\nstuff")
    expect(block).toMatchObject({ kind: "code", closed: false })
  })

  it("records bullet nesting depth", () => {
    const blocks = parseBlocks("- a\n  - b\n    - c")
    expect(blocks.map((b) => (b.kind === "bullet" ? b.indent : -1))).toEqual([0, 2, 4])
  })

  it("counts a tab as four columns", () => {
    const [block] = parseBlocks("\t- tabbed")
    expect(block).toMatchObject({ kind: "bullet", indent: 4 })
  })

  it("keeps the ordered marker so 1) does not become 1.", () => {
    const blocks = parseBlocks("1) one\n2) two")
    expect(blocks.map((b) => (b.kind === "ordered" ? b.marker : ""))).toEqual(["1)", "2)"])
  })

  it("treats a rule as a rule, not a bullet", () => {
    expect(kinds("---")).toEqual(["rule"])
    expect(kinds("***")).toEqual(["rule"])
  })

  it("models tables and html as raw rather than rewriting them", () => {
    expect(kinds("| a | b |")).toEqual(["raw"])
    expect(kinds("<div>")).toEqual(["raw"])
  })
})

describe("parseInline", () => {
  it("reads each emphasis form", () => {
    expect(parseInline("**b**")).toEqual([{ kind: "bold", text: "b" }])
    expect(parseInline("*i*")).toEqual([{ kind: "italic", text: "i" }])
    expect(parseInline("***bi***")).toEqual([{ kind: "boldItalic", text: "bi" }])
    expect(parseInline("~~s~~")).toEqual([{ kind: "strike", text: "s" }])
    expect(parseInline("`c`")).toEqual([{ kind: "code", text: "c" }])
  })

  it("prefers the longest marker so *** is not read as * plus **", () => {
    expect(parseInline("***x***")).toEqual([{ kind: "boldItalic", text: "x" }])
  })

  it("keeps surrounding text", () => {
    expect(parseInline("a **b** c")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " c" },
    ])
  })

  it("links only safe schemes and leaves the rest as visible source", () => {
    expect(parseInline("[x](https://a.test)")).toEqual([
      { kind: "link", text: "x", href: "https://a.test" },
    ])
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      { kind: "text", text: "[x](javascript:alert(1))" },
    ])
  })

  it("leaves an unclosed marker alone", () => {
    expect(parseInline("**not closed")).toEqual([{ kind: "text", text: "**not closed" }])
  })

  it("does not italicise across a multiplication sign", () => {
    expect(parseInline("5 * 3 = 15")).toEqual([{ kind: "text", text: "5 * 3 = 15" }])
  })

  it("concatenates back to the original text for any input", () => {
    const samples = [
      "plain",
      "a **b** c",
      "**a** *b* ~~c~~ `d`",
      "5 * 3",
      "[x](https://a.test) tail",
      "trailing **",
    ]
    for (const sample of samples) {
      const rebuilt = parseInline(sample)
        .map((s) => {
          switch (s.kind) {
            case "text":
              return s.text
            case "bold":
              return `**${s.text}**`
            case "italic":
              return `*${s.text}*`
            case "boldItalic":
              return `***${s.text}***`
            case "strike":
              return `~~${s.text}~~`
            case "code":
              return `\`${s.text}\``
            case "link":
              return `[${s.text}](${s.href})`
          }
        })
        .join("")
      expect(rebuilt).toBe(sample)
    }
  })
})
