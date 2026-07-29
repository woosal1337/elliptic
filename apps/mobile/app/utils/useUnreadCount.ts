import { useEffect, useState } from "react"

import { api } from "@/services/api"

/** Polls the org's unread-notification count (every 30s) for the tab badge. */
export function useUnreadCount(orgId: string | undefined): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!orgId) {
      setCount(0)
      return
    }
    let active = true
    const tick = () =>
      void api.unreadCount(orgId).then((c) => {
        if (active) setCount(c)
      })
    tick()
    const timer = setInterval(tick, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [orgId])
  return count
}
