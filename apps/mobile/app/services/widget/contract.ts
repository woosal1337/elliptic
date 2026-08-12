/**
 * The app → widget data contract.
 *
 * This file and `targets/tasks/Snapshot.swift` describe the same JSON and must
 * be changed together. They are two runtimes with no shared types and no build
 * step between them, so the only thing keeping them honest is `SNAPSHOT_VERSION`
 * and the tests in `contract.test.ts`.
 *
 * ## Why a snapshot rather than the widget fetching
 *
 * The widget runs in its own process and cannot read the app's Keychain: tokens
 * are written `WHEN_UNLOCKED_THIS_DEVICE_ONLY` with no shared access group, and
 * a Lock Screen widget draws precisely when the device is locked. So there is no
 * point at which the widget could authenticate. The app writes; the widget reads.
 *
 * ## Why the snapshot is not pre-filtered
 *
 * Each widget instance carries its own organisation, project and status filter,
 * chosen in the system's Edit Widget sheet. The app cannot know what any given
 * instance asked for, so it writes a bounded working set and the widget filters
 * it. That also lets the configuration sheet populate its pickers offline, from
 * `orgs` and `projects` here, without a round trip.
 */

/** Bump on any incompatible change, and bump `Snapshot.swift` with it. */
export const SNAPSHOT_VERSION = 1

/** The App Group both targets share. Mirrored in `app.json` entitlements. */
export const APP_GROUP = "group.sh.elliptic"

/** The key the snapshot is stored under inside the App Group. */
export const SNAPSHOT_KEY = "widget.snapshot.v1"

/**
 * How many tasks the app writes.
 *
 * The widget shows five, but it filters by an organisation, project and status
 * the app did not choose, so it needs more than five to pick from. This bound
 * keeps the payload well inside what a shared `UserDefaults` should hold — at
 * roughly 120 bytes a task it is about 24KB — while covering far more than any
 * single widget will display.
 */
export const MAX_TASKS = 200

export interface WidgetOrg {
  id: string
  name: string
}

export interface WidgetProject {
  id: string
  orgId: string
  name: string
  /** The short key, e.g. "ATLAS" — the widget shows identifiers, not names. */
  key: string
}

export interface WidgetTask {
  id: string
  orgId: string
  /** Absent for a task filed under no project; such a task matches only the
   *  "All projects" configuration, never a specific one. */
  projectId?: string
  /** e.g. "ATLAS-217". What the row leads with. */
  identifier: string
  title: string
  /** Raw API status: backlog | todo | in_progress | in_review | done | … */
  status: string
  priority: string
  /** ISO date, no time component, or omitted. */
  dueDate?: string
}

export interface WidgetSnapshot {
  v: number
  /** ISO timestamp. The widget shows this when the data is visibly stale. */
  updatedAt: string
  orgs: WidgetOrg[]
  projects: WidgetProject[]
  tasks: WidgetTask[]
}

/**
 * Statuses a widget may be configured to show.
 *
 * Deliberately only the open ones: a widget is for work you still have to do,
 * and "5 most recently completed" is a report, not a glance. Kept in the order
 * the app lists them so the configuration sheet reads the same as the app.
 */
export const WIDGET_STATUSES = ["backlog", "todo", "in_progress", "in_review"] as const
export type WidgetStatus = (typeof WIDGET_STATUSES)[number]
