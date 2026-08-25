import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { collectPaletteEntities, type PaletteCacheGroups } from "./palette-entities";

const empty: PaletteCacheGroups = { projects: [], meetings: [], notes: [], tasks: [] };

const task = { id: "t1", project_id: "p1", identifier: "ELP-1", title: "Fix the palette" };

describe("collectPaletteEntities", () => {
  it("maps a list query to entities", () => {
    const entities = collectPaletteEntities({
      ...empty,
      projects: [[{ id: "p1", name: "Elliptic", key: "ELP" }]],
      tasks: [[task]],
    });

    expect(entities).toEqual([
      {
        kind: "project",
        id: "p1",
        label: "Elliptic",
        hint: "ELP",
        keywords: ["ELP", "project"],
        route: "/projects/p1",
      },
      {
        kind: "task",
        id: "t1",
        label: "Fix the palette",
        hint: "ELP-1",
        keywords: ["ELP-1", "task"],
        route: "/projects/p1?task=t1",
      },
    ]);
  });

  it("skips a detail query, whose data is one object", () => {
    expect(collectPaletteEntities({ ...empty, tasks: [task] })).toEqual([]);
    expect(collectPaletteEntities({ ...empty, notes: [{ id: "n1", title: "Spec" }] })).toEqual([]);
    expect(collectPaletteEntities({ ...empty, meetings: [{ id: "m1", title: "Standup" }] })).toEqual(
      []
    );
  });

  it("skips a paginated payload and a null payload", () => {
    const groups = { ...empty, meetings: [{ items: [{ id: "m1", title: "Standup" }] }, null] };
    expect(collectPaletteEntities(groups)).toEqual([]);
  });

  it("skips an array of strings, such as the subscribers query", () => {
    expect(collectPaletteEntities({ ...empty, tasks: [["u1", "u2"]] })).toEqual([]);
  });

  it("skips an item without an id, a title, or a project", () => {
    const groups = {
      ...empty,
      tasks: [[{ ...task, id: "" }, { ...task, title: "  " }, { ...task, project_id: null }]],
    };
    expect(collectPaletteEntities(groups)).toEqual([]);
  });

  it("keeps one entity when two queries hold the same task", () => {
    const entities = collectPaletteEntities({ ...empty, tasks: [[task], [task]] });
    expect(entities).toHaveLength(1);
  });

  it("falls back when a project has no key and a task has no identifier", () => {
    const entities = collectPaletteEntities({
      ...empty,
      projects: [[{ id: "p2", name: "Untitled" }]],
      tasks: [[{ id: "t2", project_id: "p2", title: "No identifier" }]],
    });

    expect(entities[0]).toMatchObject({ hint: null, keywords: ["project"] });
    expect(entities[1]).toMatchObject({ hint: null, keywords: ["task"] });
  });

  it("collects nothing from an empty cache", () => {
    expect(collectPaletteEntities(empty)).toEqual([]);
  });
});

describe("against a real query cache", () => {
  it("keeps only the list query, though the prefix also matches the detail queries", () => {
    const client = new QueryClient();
    client.setQueryData(
      ["orgs", "o1", "tasks", "project", "p1"],
      [{ id: "t1", project_id: "p1", identifier: "ELP-1", title: "In the list" }]
    );
    client.setQueryData(["orgs", "o1", "tasks", "t9"], {
      id: "t9",
      project_id: "p1",
      identifier: "ELP-9",
      title: "Opened once",
    });
    client.setQueryData(["orgs", "o1", "tasks", "t9", "subscribers"], ["u1"]);

    const tasks = client.getQueriesData({ queryKey: ["orgs", "o1", "tasks"] }).map(([, data]) => data);
    expect(tasks).toHaveLength(3);

    const entities = collectPaletteEntities({ ...empty, tasks });
    expect(entities.map((entity) => entity.id)).toEqual(["t1"]);
  });
});
