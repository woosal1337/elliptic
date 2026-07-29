import { FC, useEffect } from "react"
import NetInfo from "@react-native-community/netinfo"

import { api } from "@/services/api"
import { flushQueue, type QueuedMutation } from "@/services/offlineQueue"

const replay = (m: QueuedMutation) =>
  api.apisauce[m.method](m.path, m.body).then((r) => ({ ok: r.ok ?? false, problem: r.problem }))

/** Flushes the offline mutation queue on mount and whenever connectivity returns. */
export const OfflineSync: FC = () => {
  useEffect(() => {
    void flushQueue(replay)
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flushQueue(replay)
    })
    return () => unsub()
  }, [])
  return null
}
