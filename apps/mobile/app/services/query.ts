// TanStack Query client + MMKV persistence (E1).
// Lists render instantly from the persisted cache, refetch in the background,
// and mutations invalidate by key prefix instead of manual refresh chains.
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { QueryClient } from "@tanstack/react-query"

import { storage } from "@/utils/storage"

const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // keep offline lists for a week

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: CACHE_MAX_AGE,
      retry: 2,
    },
  },
})

export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => storage.getString(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  key: "query.cache",
})

export const persistOptions = { persister: queryPersister, maxAge: CACHE_MAX_AGE }

// Key factory — every list key starts with its org so a whole org can be
// invalidated (or dropped on org switch) by prefix.
export const queryKeys = {
  tasks: (orgId: string, scope: string) => [orgId, "tasks", scope] as const,
  triage: (orgId: string) => [orgId, "triage"] as const,
  notifications: (orgId: string, filter: string) => [orgId, "notifications", filter] as const,
  notes: (orgId: string) => [orgId, "notes"] as const,
  drive: (orgId: string) => [orgId, "drive"] as const,
  projects: (orgId: string) => [orgId, "projects"] as const,
  labels: (orgId: string) => [orgId, "labels"] as const,
  projectTasks: (orgId: string, projectId: string) =>
    [orgId, "tasks", "project", projectId] as const,
}

/** Invalidate every query under a prefix, e.g. invalidate(orgId, "tasks"). */
export function invalidate(...prefix: string[]) {
  void queryClient.invalidateQueries({ queryKey: prefix })
}

/** The shape every cached task list shares. */
interface Identified {
  id: string
}

/**
 * Write a change straight into every cached list that already holds the row,
 * instead of throwing the lists away and refetching them.
 *
 * Editing a task from its detail screen used to invalidate the whole "tasks"
 * prefix, so going back to the list meant waiting on a request that returned
 * data we had already computed. Patching in place means the list is correct
 * before the navigation animation finishes, and the background refetch that
 * follows is a confirmation rather than the thing being waited on.
 *
 * Returns a rollback restoring exactly the entries this touched. The real
 * query keys are read first rather than reusing the filter — a prefix filter
 * matches several distinct keys, and writing the rollback back to the prefix
 * would create a bogus cache entry while leaving the real ones patched.
 */
function patchLists<T extends Identified>(
  orgId: string,
  kind: string,
  apply: (list: T[]) => T[],
  holds: (list: T[]) => boolean,
): () => void {
  const snapshots: [readonly unknown[], T[]][] = []

  for (const [key, list] of queryClient.getQueriesData<T[]>({ queryKey: [orgId, kind] })) {
    if (!list || !holds(list)) continue
    snapshots.push([key, list])
    queryClient.setQueryData<T[]>(key, apply(list))
  }

  return () => {
    for (const [key, previous] of snapshots) queryClient.setQueryData(key, previous)
  }
}

/** Merge `change` into a cached row wherever it appears. */
export function patchCachedEntity<T extends Identified>(
  orgId: string,
  kind: string,
  id: string,
  change: Partial<T>,
): () => void {
  return patchLists<T>(
    orgId,
    kind,
    (list) => list.map((row) => (row.id === id ? { ...row, ...change } : row)),
    (list) => list.some((row) => row.id === id),
  )
}

/** Drop a row from every cached list under a prefix. */
export function removeCachedEntity<T extends Identified>(
  orgId: string,
  kind: string,
  id: string,
): () => void {
  return patchLists<T>(
    orgId,
    kind,
    (list) => list.filter((row) => row.id !== id),
    (list) => list.some((row) => row.id === id),
  )
}
