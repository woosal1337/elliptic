import { useCallback, useEffect, useState } from "react"

import { load, save } from "@/utils/storage"

/**
 * A list fetcher with offline caching: shows the last cached result instantly,
 * refreshes from the network, and persists each result to MMKV (COS-232).
 */
export function useCachedList<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T[]>,
): { data: T[]; loading: boolean; refreshing: boolean; refresh: () => void } {
  const [data, setData] = useState<T[]>(() => (cacheKey ? (load<T[]>(cacheKey) ?? []) : []))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const run = useCallback(async () => {
    const result = await fetcher()
    setData(result)
    if (cacheKey) save(cacheKey, result)
    setLoading(false)
    setRefreshing(false)
  }, [cacheKey, fetcher])

  useEffect(() => {
    const cached = cacheKey ? load<T[]>(cacheKey) : null
    if (cached) setData(cached)
    setLoading(!cached || cached.length === 0)
    void run()
  }, [cacheKey, run])

  const refresh = useCallback(() => {
    setRefreshing(true)
    void run()
  }, [run])

  return { data, loading, refreshing, refresh }
}
