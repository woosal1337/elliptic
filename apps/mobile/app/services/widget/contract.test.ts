import { MAX_TASKS, SNAPSHOT_VERSION } from "./contract"

import { buildSnapshot, type OrgContribution } from "./index"

/**
 * Guards the app → widget JSON contract.
 *
 * `targets/tasks/Snapshot.swift` decodes exactly these keys and nothing checks
 * that at build time — the widget is a separate target compiled from Swift,
 * with no shared types and no codegen between them. A renamed field here would
 * ship a widget that silently decodes nothing and renders its empty state.
 *
 * So the key-name assertions below are not busywork: they are the only thing
 * that fails when the two halves drift. If one of them breaks, change
 * `Snapshot.swift` in the same commit.
 */

const org = { id: "org-1", name: "Refik Anadol Studio" }
const project = { id: "proj-1", name: "Atlas", key: "ATLAS" }

function task(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "t1",
    number: 1,
    identifier: "ATLAS-1",
    title: "Ship it",
    status: "todo",
    priority: "high",
    assignee_id: null,
    project_id: "proj-1",
    ...over,
  } as never
}

function contribution(over: Partial<OrgContribution> = {}): OrgContribution {
  return { org, projects: [project], tasks: [task()], ...over } as OrgContribution
}

const NOW = new Date("2026-08-12T09:00:00.000Z")

describe("widget snapshot contract", () => {
  it("emits exactly the keys Snapshot.swift decodes", () => {
    const snapshot = buildSnapshot([contribution()], NOW)

    expect(Object.keys(snapshot).sort()).toEqual(["orgs", "projects", "tasks", "updatedAt", "v"])
    expect(Object.keys(snapshot.orgs[0]!).sort()).toEqual(["id", "name"])
    expect(Object.keys(snapshot.projects[0]!).sort()).toEqual(["id", "key", "name", "orgId"])
    expect(Object.keys(snapshot.tasks[0]!).sort()).toEqual([
      "id",
      "identifier",
      "orgId",
      "priority",
      "projectId",
      "status",
      "title",
    ])
  })

  it("declares the version Swift checks", () => {
    expect(buildSnapshot([contribution()], NOW).v).toBe(SNAPSHOT_VERSION)
  })

  it("stamps the org onto every task, since the API types carry none", () => {
    const snapshot = buildSnapshot([contribution()], NOW)
    expect(snapshot.tasks[0]!.orgId).toBe("org-1")
    expect(snapshot.projects[0]!.orgId).toBe("org-1")
  })

  it("omits absent optionals rather than emitting null", () => {
    // Swift decodes `String?`, so null would work — but an omitted key keeps
    // the payload smaller, and the payload shares a UserDefaults suite.
    const snapshot = buildSnapshot(
      [contribution({ tasks: [task({ due_date: null, project_id: null })] })],
      NOW,
    )
    expect(snapshot.tasks[0]).not.toHaveProperty("dueDate")
    expect(snapshot.tasks[0]).not.toHaveProperty("projectId")
  })

  it("carries only open tasks — a widget is for work still to do", () => {
    const snapshot = buildSnapshot(
      [
        contribution({
          tasks: [
            task({ id: "a", status: "todo" }),
            task({ id: "b", status: "done" }),
            task({ id: "c", status: "cancelled" }),
            task({ id: "d", status: "in_review" }),
          ],
        }),
      ],
      NOW,
    )
    expect(snapshot.tasks.map((t) => t.id)).toEqual(["a", "d"])
  })

  it("drops the least urgent when over the cap", () => {
    const many = Array.from({ length: MAX_TASKS + 5 }, (_, i) =>
      task({ id: `t${i}`, identifier: `ATLAS-${i}`, due_date: i < 3 ? "2026-01-01" : null }),
    )
    const snapshot = buildSnapshot([contribution({ tasks: many })], NOW)
    expect(snapshot.tasks).toHaveLength(MAX_TASKS)
    // The dated ones survive the cut.
    expect(snapshot.tasks.slice(0, 3).every((t) => t.dueDate)).toBe(true)
  })

  it("merges several organisations into one pool", () => {
    const other = { id: "org-2", name: "Personal" }
    const snapshot = buildSnapshot(
      [
        contribution(),
        contribution({
          org: other,
          projects: [{ id: "proj-2", name: "Todo", key: "TD" }],
          tasks: [task({ id: "t2", identifier: "TD-2", project_id: "proj-2" })],
        }),
      ],
      NOW,
    )
    expect(snapshot.orgs.map((o) => o.id)).toEqual(["org-1", "org-2"])
    expect(new Set(snapshot.tasks.map((t) => t.orgId))).toEqual(new Set(["org-1", "org-2"]))
  })
})
