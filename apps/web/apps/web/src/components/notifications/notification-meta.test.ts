import { describe, expect, it } from "bun:test";
import type { Notification } from "@/hooks/use-notification-queries";
import { entityHref } from "./notification-meta";

function notification(fields: Partial<Notification>): Notification {
  return {
    id: "n1",
    org_id: "org1",
    type: "assigned",
    entity_type: "task",
    entity_id: "task1",
    project_id: null,
    actor_id: null,
    actor_name: null,
    title: "ATLAS-268 is In Review",
    snippet: null,
    read_at: null,
    archived_at: null,
    snoozed_until: null,
    created_at: "2026-08-20T09:00:00Z",
    ...fields,
  };
}

describe("entityHref", () => {
  it("puts the project in the path so the task dialog can open", () => {
    expect(entityHref("org1", notification({ project_id: "proj1" }))).toBe(
      "/app/org1/projects/proj1?task=task1"
    );
  });

  it("falls back to the resolver when the project is missing", () => {
    expect(entityHref("org1", notification({ project_id: null }))).toBe(
      "/app/org1/browse/task1"
    );
  });

  it("links a project, a meeting, and a note directly", () => {
    expect(
      entityHref("org1", notification({ entity_type: "project", entity_id: "p1" }))
    ).toBe("/app/org1/projects/p1");
    expect(
      entityHref("org1", notification({ entity_type: "meeting", entity_id: "m1" }))
    ).toBe("/app/org1/meetings/m1");
    expect(entityHref("org1", notification({ entity_type: "note", entity_id: "d1" }))).toBe(
      "/app/org1/notes/d1"
    );
  });

  it("returns null for an entity with no page", () => {
    expect(entityHref("org1", notification({ entity_type: "organization" }))).toBeNull();
  });

  it("returns null when the notification names no record", () => {
    expect(entityHref("org1", notification({ entity_id: null }))).toBeNull();
  });
});
