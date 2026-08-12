import { useEffect } from "react"

import type { Org, Project, Task } from "@/services/api/types"

import { publishSnapshot } from "./index"

/**
 * Keeps the iOS widget's snapshot in step with what the app has loaded.
 *
 * The first real call site for `publishSnapshot`. It publishes the **active
 * organisation only**, because that is all the app has fetched at any moment —
 * the API is org-scoped per request, so a widget pointed at another workspace
 * shows nothing until that workspace has been opened at least once.
 *
 * Closing that gap means fetching every organisation the user belongs to on a
 * schedule, which is a background-refresh design rather than a hook, and is
 * deliberately left for the push-driven refresh work.
 */
export function useWidgetSnapshot(
  org: Org | null | undefined,
  projects: Project[],
  tasks: Task[],
): void {
  // Depend on lengths and identity rather than the arrays themselves:
  // `useListQuery` hands back a new array on every render, so the raw values
  // would republish — and reload every widget on the device — continuously.
  const fingerprint = `${org?.id ?? ""}:${projects.length}:${tasks.length}:${tasks
    .map((t) => `${t.id}${t.status}`)
    .join("")}`

  useEffect(() => {
    if (!org) return
    publishSnapshot([{ org, projects, tasks }])
    // `fingerprint` is the dependency; the arrays are read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint])
}
