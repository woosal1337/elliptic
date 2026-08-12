import { Platform } from "react-native"

import type { Org, Project, Task } from "@/services/api/types"

import {
  APP_GROUP,
  MAX_TASKS,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
  WIDGET_STATUSES,
  type WidgetSnapshot,
  type WidgetTask,
} from "./contract"
import { WidgetBridge } from "../../../modules/widget-bridge"

export * from "./contract"

/**
 * Publishes the app → widget snapshot.
 *
 * The widget cannot fetch for itself — see `contract.ts` — so everything it will
 * ever show has to be written here first. Nothing on this path may throw: a
 * failed widget write must never take down a task list, so `publishSnapshot`
 * swallows its errors and leaves the previous snapshot in place. A slightly
 * stale widget beats a crash.
 */

/**
 * The widget kind reloaded after a write. Must match `TasksWidget.kind`.
 *
 * Named rather than reloading everything: the refresh budget WidgetKit grants
 * is finite and shared, and spending it redrawing widgets whose data did not
 * change is what makes the one that did change update late.
 */
const WIDGET_KIND = "TasksWidget"

const OPEN_STATUSES = new Set<string>(WIDGET_STATUSES)

/**
 * One organisation's contribution to the snapshot.
 *
 * The org is passed alongside its rows because the API is org-scoped by request
 * — `Task` and `Project` carry no `org_id` of their own — and the widget must
 * know which workspace every task belongs to, both to filter and to deep-link
 * into the right one.
 */
export interface OrgContribution {
  org: Org
  projects: Project[]
  tasks: Task[]
}

/**
 * Trims a task to what the widget draws.
 *
 * Descriptions, labels, subtask counts and assignees are dropped: none are
 * rendered, and this payload shares a `UserDefaults` suite where size is a real
 * constraint rather than a rounding error.
 */
function pack(task: Task, orgId: string): WidgetTask {
  return {
    id: task.id,
    orgId,
    ...(task.project_id ? { projectId: task.project_id } : {}),
    identifier: task.identifier,
    title: task.title,
    status: task.status,
    priority: task.priority,
    ...(task.due_date ? { dueDate: task.due_date } : {}),
  }
}

/**
 * Orders the pool so the cap bites in the right place.
 *
 * Soonest due first, undated last. The widget re-sorts for display anyway; what
 * matters here is that if there are more than {@link MAX_TASKS} open tasks, the
 * ones dropped are the least urgent rather than an arbitrary slice.
 */
function byUrgency(a: WidgetTask, b: WidgetTask): number {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.dueDate && !b.dueDate) return -1
  if (!a.dueDate && b.dueDate) return 1
  return a.identifier < b.identifier ? -1 : 1
}

/** Build the payload. Pure, so its shape can be asserted in a test. */
export function buildSnapshot(contributions: OrgContribution[], now: Date): WidgetSnapshot {
  const tasks: WidgetTask[] = []
  const projects: WidgetSnapshot["projects"] = []

  for (const { org, projects: orgProjects, tasks: orgTasks } of contributions) {
    for (const project of orgProjects) {
      projects.push({ id: project.id, orgId: org.id, name: project.name, key: project.key })
    }
    for (const task of orgTasks) {
      if (OPEN_STATUSES.has(task.status)) tasks.push(pack(task, org.id))
    }
  }

  return {
    v: SNAPSHOT_VERSION,
    updatedAt: now.toISOString(),
    orgs: contributions.map(({ org }) => ({ id: org.id, name: org.name })),
    projects,
    tasks: tasks.sort(byUrgency).slice(0, MAX_TASKS),
  }
}

/**
 * Write the snapshot and ask WidgetKit to redraw.
 *
 * A no-op off iOS: Android widgets are a separate target with their own
 * storage, so doing nothing here is correct rather than unfinished.
 */
export function publishSnapshot(contributions: OrgContribution[], now: Date = new Date()): void {
  // `WidgetBridge` is null off iOS, and also on any build made before the module
  // existed — `requireOptionalNativeModule` returns null rather than throwing.
  if (Platform.OS !== "ios" || !WidgetBridge) return
  try {
    const json = JSON.stringify(buildSnapshot(contributions, now))
    if (!WidgetBridge.setItem(APP_GROUP, SNAPSHOT_KEY, json)) return
    // Without this the widget keeps its last render until the system next
    // decides to refresh it, which can be an hour away.
    WidgetBridge.reload(WIDGET_KIND)
  } catch {
    // Deliberately silent — see the note at the top of this file.
  }
}
