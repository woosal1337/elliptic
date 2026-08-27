import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown, plainText } from "./markdown";

function render(source: string): string {
  return renderToStaticMarkup(<Markdown source={source} orgId="org1" />);
}

const TABLE = ["| State | Behaviour |", "|---|---|", "| allowed | the control works |"].join("\n");

describe("tables", () => {
  it("renders a real table, not a row of paragraphs", () => {
    const html = render(TABLE);

    expect(html).toContain("<table");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html.match(/<th\b/g) ?? []).toHaveLength(2);
    expect(html.match(/<td\b/g) ?? []).toHaveLength(2);
    expect(html).toContain("State");
    expect(html).toContain("the control works");
    expect(html).not.toContain("|---|");
  });

  it("renders inline markdown inside a cell", () => {
    const html = render(
      ["| Flag | Note |", "| --- | --- |", '| **closed** | `denied="disable"` |'].join("\n")
    );

    expect(html).toContain("<strong>closed</strong>");
    expect(html).toContain("<code");
    expect(html).toContain("denied=");
  });

  it("reads the alignment row", () => {
    const html = render(["| a | b | c |", "| :--- | :---: | ---: |", "| 1 | 2 | 3 |"].join("\n"));

    expect(html).toContain("text-left");
    expect(html).toContain("text-center");
    expect(html).toContain("text-right");
  });

  it("accepts a table with no outer pipes", () => {
    const html = render(["a | b", "--- | ---", "1 | 2"].join("\n"));

    expect(html.match(/<th\b/g) ?? []).toHaveLength(2);
    expect(html.match(/<td\b/g) ?? []).toHaveLength(2);
  });

  it("pads a short row and drops an extra cell", () => {
    const html = render(["| a | b |", "|---|---|", "| 1 |", "| 1 | 2 | 3 |"].join("\n"));

    expect(html.match(/<tr>/g) ?? []).toHaveLength(3);
    expect(html.match(/<td\b/g) ?? []).toHaveLength(4);
    expect(html).not.toContain(">3</td>");
  });

  it("keeps an escaped pipe inside one cell", () => {
    const html = render(["| a | b |", "|---|---|", "| left \\| right | 2 |"].join("\n"));

    expect(html.match(/<td\b/g) ?? []).toHaveLength(2);
    expect(html).toContain("left | right");
  });

  it("ends the table at the first line without a pipe", () => {
    const html = render([TABLE, "After the table."].join("\n"));

    expect(html.match(/<table\b/g) ?? []).toHaveLength(1);
    expect(html).toContain("<p ");
    expect(html).toContain("After the table.");
  });

  it("leaves a pipe in prose alone", () => {
    const html = render("Now `reports:read:own | reports:read:all` and nothing else.");

    expect(html).not.toContain("<table");
    expect(html).toContain("<code");
  });

  it("needs a delimiter row", () => {
    const html = render(["| a | b |", "| 1 | 2 |"].join("\n"));

    expect(html).not.toContain("<table");
  });
});

describe("other blocks", () => {
  it("renders an ordered list", () => {
    const html = render(["1. first", "2. second"].join("\n"));

    expect(html).toContain("<ol");
    expect(html.match(/<li>/g) ?? []).toHaveLength(2);
  });

  it("renders a quote and a divider", () => {
    expect(render("> quoted line")).toContain("<blockquote");
    expect(render("---")).toContain("<hr");
  });

  it("still renders headings, bullets, code and links", () => {
    const html = render(
      ["# Title", "- one", "```", "code()", "```", "[docs](https://example.com)"].join("\n")
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<ul");
    expect(html).toContain("<pre");
    expect(html).toContain('href="https://example.com"');
  });

  it("shows a placeholder for empty input", () => {
    expect(render("")).toContain("Nothing here yet.");
  });
});

describe("plainText", () => {
  it("drops the table syntax", () => {
    expect(plainText(TABLE)).toBe("State Behaviour allowed the control works");
  });

  it("drops headings, quotes and both list markers", () => {
    expect(plainText(["# Title", "> note", "- one", "1. two"].join("\n"))).toBe(
      "Title note one two"
    );
  });
});
