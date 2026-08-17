import * as Linking from "expo-linking"

import { navigate } from "@/navigators/navigationUtilities"

/**
 * The one payload that opens an entity, and the one function that routes it.
 *
 * Three surfaces produce it and they all carry the same four fields under the
 * same names: a push notification (`content.data`), a widget row
 * (`elliptic://open?…`, built by `DeepLink.task` in
 * `targets/tasks/TasksWidgetView.swift`), and any link we hand out later.
 * Keeping one payload shape means one routing path, so a fix to the routing
 * lands for all of them at once.
 *
 * The names are snake_case because the API and APNs choose them, not us.
 */
export type EntityLink = {
  entity_type?: string
  entity_id?: string
  identifier?: string
  org_id?: string
}

/** The host that means "open this entity". */
const OPEN_HOST = "open"

/**
 * Reads an `elliptic://open?…` URL into an {@link EntityLink}.
 *
 * Returns null for every other URL, so the caller can ignore links that belong
 * to something else — the Expo dev client, for one, opens the app with its own
 * URL on every launch in development.
 *
 * The host is compared rather than the scheme: the app answers to both
 * `elliptic://` and `companyos://`, and an https universal link would arrive
 * with the same `/open` path.
 */
export function parseEntityLink(url: string): EntityLink | null {
  let parsed: ReturnType<typeof Linking.parse>
  try {
    parsed = Linking.parse(url)
  } catch {
    return null
  }

  const host = parsed.hostname ?? parsed.path?.replace(/^\/+/, "")
  if (host !== OPEN_HOST) return null

  const params = parsed.queryParams ?? {}
  // `queryParams` types every value as `string | string[]`, because a query can
  // repeat a key. Ours never do, so a repeated key is a malformed link and the
  // first value is the honest reading of it.
  const one = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : (value ?? undefined)

  return {
    entity_type: one(params.entity_type),
    entity_id: one(params.entity_id),
    identifier: one(params.identifier),
    org_id: one(params.org_id),
  }
}

/**
 * Opens the entity a link points at, or the inbox when it names none.
 *
 * Moved here from `PushRegistrar` so the widget can reach it. It only
 * navigates: switching the active organisation happens in the caller, which is
 * where the org context lives, and has to happen first — see `useEntityLink`.
 *
 * ## `initial: false` is load-bearing
 *
 * It keeps the tab's list screen underneath, so the detail gets a back button.
 * Without it `navigate()` replaces the nested stack's state and the detail
 * becomes its root — a dead end, because detail screens hide the tab bar. Worse
 * than a dead end, in fact: `persistNavigation` is `"prod"`, so that one-route
 * stack is saved and restored, and the app reopens onto a screen it cannot
 * leave until it is reinstalled. COS-407.
 *
 * `openEntity` has carried this flag all along. This path was lifted out of
 * `PushRegistrar`, which never had it, so every notification tap built the dead
 * end. Both routes now agree.
 */
export function routeToEntity(data: EntityLink | undefined): void {
  if (!data) return
  if (data.entity_type === "task" && data.entity_id) {
    navigate("Main", {
      screen: "Tasks",
      // The identifier (COS-234) rides along so the header reads right on the
      // first frame instead of flashing "Task" until the fetch lands — which on
      // a cold start is the slowest moment there is.
      params: {
        screen: "TaskDetail",
        params: { taskId: data.entity_id, title: data.identifier ?? "Task" },
        initial: false,
      },
    })
  } else if (data.entity_type === "note" && data.entity_id) {
    navigate("Main", {
      screen: "Notes",
      params: {
        screen: "NoteDetail",
        params: { noteId: data.entity_id, title: "Note" },
        initial: false,
      },
    })
  } else {
    // Notifications is the Inbox stack's own first screen, so it already has
    // somewhere to go back to.
    navigate("Main", { screen: "Inbox", params: { screen: "Notifications" } })
  }
}
