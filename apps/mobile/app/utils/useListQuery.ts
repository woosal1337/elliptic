import { useQuery } from "@tanstack/react-query"

/**
 * List fetcher on TanStack Query (E1): renders the persisted cache instantly,
 * refetches in the background, and re-runs whenever the key changes.
 * Pass `null` while prerequisites (org, auth) are missing to disable.
 */
export function useListQuery<T>(
  queryKey: readonly unknown[] | null,
  fetcher: () => Promise<T[]>,
): { data: T[]; loading: boolean; refreshing: boolean; refresh: () => void } {
  const query = useQuery({
    queryKey: queryKey ?? ["__disabled__"],
    queryFn: fetcher,
    enabled: queryKey !== null,
  })
  return {
    data: query.data ?? [],
    loading: query.isPending && query.data === undefined,
    refreshing: query.isRefetching,
    refresh: () => void query.refetch(),
  }
}
