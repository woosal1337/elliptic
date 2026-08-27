import { describe, expect, it } from "bun:test";
import { taskCardContext } from "./task-context";
import type { Task } from "@/lib/types";

function task(extras: Record<string, unknown>): Task {
  return { id: "t1", title: "A task", ...extras } as unknown as Task;
}

describe("taskCardContext", () => {
  it("strips the markdown from a comment written by the server", () => {
    const line = taskCardContext(
      task({
        latest_comment: {
          content: "↩︎ Status moved back from **Cancelled** to **Todo**.",
          author_name: "Ege",
        },
      }),
      null
    );

    expect(line).toBe("↩︎ Status moved back from Cancelled to Todo. — Ege");
  });

  it("strips the markdown from a context line and a string comment", () => {
    expect(taskCardContext(task({ context_line: "**Blocked** by `ELP-1`" }), null)).toBe(
      "Blocked by ELP-1"
    );
    expect(taskCardContext(task({ latest_comment: "# Heading\n- one" }), null)).toBe(
      "Heading one"
    );
  });

  it("falls back to the comment count when nothing else is left", () => {
    expect(taskCardContext(task({ latest_comment: "   ", comment_count: 2 }), "Ege")).toBe(
      "2 comments · Ege"
    );
    expect(taskCardContext(task({ comment_count: 0 }), "Ege")).toBeNull();
  });
});
