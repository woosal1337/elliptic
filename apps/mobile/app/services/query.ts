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
  stickies: (orgId: string) => [orgId, "stickies"] as const,
  projects: (orgId: string) => [orgId, "projects"] as const,
  labels: (orgId: string) => [orgId, "labels"] as const,
  projectTasks: (orgId: string, projectId: string) =>
    [orgId, "tasks", "project", projectId] as const,
}

/** Invalidate every query under a prefix, e.g. invalidate(orgId, "tasks"). */
export function invalidate(...prefix: string[]) {
  void queryClient.invalidateQueries({ queryKey: prefix })
}
