import { FC, useEffect, useRef } from "react"
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

  const coldStartHandled = useRef(false)

  useEffect(() => {
    // Cold start: the app was launched by tapping a notification.
    //
    // This waits for auth and the active org before routing. Navigating the
    // moment the component mounts beat the org context to it, so the detail
    // screen fetched with no org and rendered "Couldn't open this task" for a
    // task that was there all along — the deep link looked broken when only its
    // timing was. The ref keeps it to one navigation per launch, since the
    // effect now re-runs as those values settle.
    if (!isAuthenticated || !activeOrg || coldStartHandled.current) return
    coldStartHandled.current = true
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response)
        routeFromData(response.notification.request.content.data as PushData | undefined)
    })
  }, [isAuthenticated, activeOrg])

  useEffect(() => {
    // Warm: tapped while the app is running, so the context is already up.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromData(response.notification.request.content.data as PushData | undefined)
    })
    return () => sub.remove()
  }, [])

  return null
}
