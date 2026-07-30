import { useEffect, useState } from "react"

/**
 * Debounced query runner for search fields (B8): holds the raw input, waits for
 * a pause in typing, then runs `search`. Results from a stale keystroke are
 * discarded, so a slow response can't overwrite a newer one.
 */
export function useDebouncedSearch<T>(
  search: (query: string) => Promise<T[]>,
  { minLength = 2, delay = 300 }: { minLength?: number; delay?: number } = {},
): {
  query: string
  setQuery: (q: string) => void
  results: T[]
  searching: boolean
} {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<T[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < minLength) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    let live = true
    const handle = setTimeout(() => {
      void search(trimmed).then((r) => {
        if (!live) return
        setResults(r)
        setSearching(false)
      })
    }, delay)
    return () => {
      live = false
      clearTimeout(handle)
    }
    // `search` is recreated per render by callers; the query is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minLength, delay])

  return { query, setQuery, results, searching }
}
