"use client";

import { createElement, useState, type ReactNode } from "react";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { removeOldestQuery } from "@tanstack/query-persist-client-core";
import { ApiError } from "./api";

/**
 * How long a cached response is still worth showing on a cold load. Long
 * enough that reopening the tab in the morning paints immediately; short
 * enough that a week-old board is refetched rather than trusted.
 */
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Must be at least the persister's maxAge, or a restored entry is
        // garbage-collected before anything can render it.
        gcTime: CACHE_MAX_AGE,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

/**
 * The persister, or null when there is no window to persist into.
 *
 * This module is a client component, but Next still evaluates it while
 * prerendering, where `localStorage` does not exist. Returning null there keeps
 * the provider working without a storage layer rather than throwing.
 */
function makePersister() {
  if (typeof window === "undefined") return null;
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: CACHE_KEY,
    // localStorage caps around 5MB and a workspace with many projects fans out
    // one cached list per project. Without this, the first write past the quota
    // throws and nothing is ever persisted again; instead, shed the oldest
    // queries until it fits.
    retry: removeOldestQuery,
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  const [persister] = useState(makePersister);

  const persistOptions = persister
    ? {
        persister,
        maxAge: CACHE_MAX_AGE,
        // Bump when a cached shape changes: an entry restored from an older
        // deploy would otherwise reach code that no longer understands it.
        buster: CACHE_VERSION,
        dehydrateOptions: {
          // Only settled queries are worth keeping. Persisting an error would
          // restore a broken screen on the next load with no way to clear it.
          shouldDehydrateQuery: (query: Query) => query.state.status === "success",
        },
      }
    : // Prerendering: no storage to persist into, but the provider still has to
      // exist so the hooks beneath it resolve.
      { persister: noopPersister };

  return createElement(PersistQueryClientProvider, { client, persistOptions }, children);
}

/** Cache shape version. Any change to a cached payload's shape needs a bump. */
const CACHE_VERSION = "1";

const CACHE_KEY = "elliptic.query-cache";

/**
 * Drop the on-disk cache.
 *
 * `queryClient.clear()` only empties memory. Once the cache is persisted, a
 * sign-out that leaves localStorage alone would let the next person on this
 * machine restore the previous workspace — every task title and comment that
 * had been loaded. Call this everywhere the session ends.
 */
export function clearPersistedCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // Private mode or a full quota: nothing was persisted to begin with.
  }
}

const noopPersister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};
