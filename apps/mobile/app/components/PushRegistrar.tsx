import { FC, useEffect, useRef } from "react"
import * as Notifications from "expo-notifications"
import { useMMKVBoolean } from "react-native-mmkv"

import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import type { EntityLink } from "@/services/deepLink"
import { registerForPush } from "@/services/push"
import { useEntityLink } from "@/services/useEntityLink"
import { storage } from "@/utils/storage"

// iOS keeps handing back the same "last notification response" on every cold
// start until it is cleared from Notification Center, so an in-memory guard
// re-fires it every launch. Remembering the id across launches is what makes a
// notification route once — without it the app reopens the same task on every
// launch, whatever the user did in between.
const HANDLED_KEY = "push.lastHandledId"

/** Registers this device for push and deep-links notification taps. */
export const PushRegistrar: FC = () => {
  const { isAuthenticated } = useAuth()
  const { activeOrg } = useOrg()
  const [pushEnabled] = useMMKVBoolean("push.enabled")

  useEffect(() => {
    // pushEnabled defaults to true (undefined) unless the user turned it off.
    if (isAuthenticated && activeOrg && pushEnabled !== false) void registerForPush(activeOrg.id)
  }, [isAuthenticated, activeOrg, pushEnabled])

  // Shared with the widget's URLs — a push and a widget row carry the same
  // payload, and `useEntityLink` is the one place that switches workspace
  // before navigating.
  const route = useEntityLink()

  const coldStartChecked = useRef(false)

  useEffect(() => {
    // Cold start: the app was launched by tapping a notification. Wait for auth
    // and the org list, since routing needs to know which workspace to be in.
    if (!isAuthenticated || !activeOrg || coldStartChecked.current) return
    coldStartChecked.current = true
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      const id = response.notification.request.identifier
      if (storage.getString(HANDLED_KEY) === id) return
      storage.set(HANDLED_KEY, id)
      route(response.notification.request.content.data as EntityLink | undefined)
    })
  }, [isAuthenticated, activeOrg, route])

  useEffect(() => {
    // Warm: tapped while the app is running, so the context is already up.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      storage.set(HANDLED_KEY, response.notification.request.identifier)
      route(response.notification.request.content.data as EntityLink | undefined)
    })
    return () => sub.remove()
  }, [route])

  return null
}
