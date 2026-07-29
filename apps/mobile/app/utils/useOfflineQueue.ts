import { useEffect, useState } from "react"

import { subscribe } from "@/services/offlineQueue"

/** Live count of unsynced offline mutations. */
export function useOfflineQueue(): number {
  const [count, setCount] = useState(0)
  useEffect(() => subscribe(setCount), [])
  return count
}
