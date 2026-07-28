import { describe, expect, it } from "bun:test";
import type { Task, TaskPriority } from "@/lib/types";
import { sortTasksBy } from "./display-config";

function task(
  id: string,
  fields: { updated?: string; created?: string; order?: number; priority?: TaskPriority; due?: string }
): Task {
  return {
    id,
    title: id,
    updated_at: fields.updated ?? "2026-01-01T00:00:00Z",
    created_at: fields.created ?? "2026-01-01T00:00:00Z",
    sort_order: fields.order ?? 0,
    priority: fields.priority ?? "none",
    due_date: fields.due ?? null,
  } as Task;
}

const ids = (tasks: Task[]) => tasks.map((item) => item.id);

describe("sortTasksBy", () => {
  it("puts the most recently touched task first", () => {
    const tasks = [
      task("old", { updated: "2026-07-01T09:00:00Z" }),
      task("newest", { updated: "2026-07-27T18:00:00Z" }),
      task("middle", { updated: "2026-07-20T12:00:00Z" }),
    ];
    expect(ids(sortTasksBy(tasks, "updated"))).toEqual(["newest", "middle", "old"]);
  });

  it("breaks priority and due-date ties by recency, not creation order", () => {
    const tasks = [
      task("first-created", { order: 1, updated: "2026-07-01T09:00:00Z", priority: "high", due: "2026-08-01" }),
      task("just-moved", { order: 2, updated: "2026-07-27T18:00:00Z", priority: "high", due: "2026-08-01" }),
    ];
    expect(ids(sortTasksBy(tasks, "priority"))).toEqual(["just-moved", "first-created"]);
    expect(ids(sortTasksBy(tasks, "due"))).toEqual(["just-moved", "first-created"]);
  });

  it("keeps manual order hand-arranged, oldest first", () => {
    const tasks = [
      task("second", { order: 2, updated: "2026-07-27T18:00:00Z" }),
      task("first", { order: 1, updated: "2026-07-01T09:00:00Z" }),
    ];
    expect(ids(sortTasksBy(tasks, "manual"))).toEqual(["first", "second"]);
  });

  it("leaves the input array untouched", () => {
    const tasks = [task("a", { updated: "2026-07-01T09:00:00Z" }), task("b", { updated: "2026-07-27T18:00:00Z" })];
    sortTasksBy(tasks, "updated");
    expect(ids(tasks)).toEqual(["a", "b"]);
  });
});
