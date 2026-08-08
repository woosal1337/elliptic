import { FC, useEffect } from "react"
import * as Notifications from "expo-notifications"
import { useMMKVBoolean } from "react-native-mmkv"

import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import { navigate } from "@/navigators/navigationUtilities"
import { registerForPush } from "@/services/push"

/** The slice of a push payload this app routes on. */
type PushData = { entity_type?: string; entity_id?: string; identifier?: string }

/** Route a tapped push to its entity (task/note), else open the inbox. */
function routeFromData(data: PushData | undefined) {
  if (!data) return
  if (data.entity_type === "task" && data.entity_id) {
    navigate("Main", {
      screen: "Tasks",
      // The API sends the human key (COS-234) with the push, so the header reads
      // right from the first frame instead of flashing "Task" until the fetch
      // lands — which on a cold start is the slowest moment there is.
      params: {
        screen: "TaskDetail",
        params: { taskId: data.entity_id, title: data.identifier ?? "Task" },
      },
    })
  } else if (data.entity_type === "note" && data.entity_id) {
    navigate("Main", {
      screen: "Notes",
      params: { screen: "NoteDetail", params: { noteId: data.entity_id, title: "Note" } },
    })
  } else {
    navigate("Main", { screen: "Inbox", params: { screen: "Notifications" } })
  }
}

/** Registers this device for push and deep-links notification taps. */
export const PushRegistrar: FC = () => {
  const { isAuthenticated } = useAuth()
  const { activeOrg } = useOrg()
  const [pushEnabled] = useMMKVBoolean("push.enabled")

  useEffect(() => {
    // pushEnabled defaults to true (undefined) unless the user turned it off.
    if (isAuthenticated && activeOrg && pushEnabled !== false) void registerForPush(activeOrg.id)
  }, [isAuthenticated, activeOrg, pushEnabled])

  useEffect(() => {
    // Cold start: app opened from a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response)
        routeFromData(response.notification.request.content.data as PushData | undefined)
    })
    // Warm: tapped while the app is running.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromData(response.notification.request.content.data as PushData | undefined)
    })
    return () => sub.remove()
  }, [])

  return null
}
