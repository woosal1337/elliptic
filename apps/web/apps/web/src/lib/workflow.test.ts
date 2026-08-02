import { describe, expect, it } from "bun:test";
import {
  defaultWorkflow,
  groupByCategory,
  moveWithinCategory,
  type WorkflowStatus,
} from "./workflow";

describe("defaultWorkflow", () => {
  it("maps every built-in status into its fixed category", () => {
    const wf = defaultWorkflow();
    // Must match the API's TaskStatus enum exactly. A status missing here is
    // dropped from the grouped list, which hides its tasks outright.
    expect(wf.map((s) => s.id)).toEqual([
      "backlog",
      "todo",
      "in_progress",
      "in_review",
      "done",
      "cancelled",
      "duplicate",
    ]);
    expect(wf.find((s) => s.id === "in_progress")!.category).toBe("started");
    expect(wf.find((s) => s.id === "duplicate")!.category).toBe("cancelled");
    expect(wf.filter((s) => s.is_default)).toHaveLength(1);
  });
});

describe("groupByCategory", () => {
  it("groups statuses under the fixed category order", () => {
    const grouped = groupByCategory(defaultWorkflow());
    expect(grouped.map((g) => g.category)).toEqual([
      "backlog",
      "unstarted",
      "started",
      "completed",
      "cancelled",
    ]);
    expect(grouped.find((g) => g.category === "started")!.statuses).toHaveLength(2);
  });
});

describe("moveWithinCategory", () => {
  const started: WorkflowStatus[] = [
    { id: "a", name: "In Progress", category: "started", color: "warning", position: 0, is_default: false, team_id: null },
    { id: "b", name: "In Review", category: "started", color: "accent", position: 1, is_default: false, team_id: null },
    { id: "c", name: "Done", category: "completed", color: "success", position: 2, is_default: false, team_id: null },
  ];

  it("swaps order within the same category", () => {
    const moved = moveWithinCategory(started, "b", "up");
    expect(moved.find((s) => s.id === "b")!.position).toBe(0);
    expect(moved.find((s) => s.id === "a")!.position).toBe(1);
  });

  it("never moves a status across a category boundary", () => {
    const moved = moveWithinCategory(started, "b", "down");
    expect(moved).toEqual(started);
  });
});
