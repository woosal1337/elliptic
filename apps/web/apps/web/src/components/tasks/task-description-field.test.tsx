import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskDescriptionField } from "./task-description-field";

const mention = { resolve: () => [], onActivate: () => {} };

function render(value: string): string {
  return renderToStaticMarkup(
    <TaskDescriptionField value={value} onChange={() => {}} orgId="org1" mention={mention} />
  );
}

describe("TaskDescriptionField", () => {
  it("reads a table with the same renderer the comments use", () => {
    const html = render(["| a | b |", "|---|---|", "| 1 | 2 |"].join("\n"));

    expect(html).toContain("<table");
    expect(html.match(/<th\b/g) ?? []).toHaveLength(2);
    expect(html).not.toContain("|---|");
  });

  it("shows the label when the description is empty", () => {
    expect(render("   ")).toContain("Add a description…");
  });
});
