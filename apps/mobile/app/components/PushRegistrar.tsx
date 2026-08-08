import { FC, useCallback, useEffect, useRef } from "react"
import * as Notifications from "expo-notifications"
import { useMMKVBoolean } from "react-native-mmkv"

import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import { navigate } from "@/navigators/navigationUtilities"
import { registerForPush } from "@/services/push"
import { storage } from "@/utils/storage"

/** The slice of a push payload this app routes on. */
type PushData = {
  entity_type?: string
  entity_id?: string
  identifier?: string
  org_id?: string
}

// iOS keeps handing back the same "last notification response" on every cold
// start until it is cleared from Notification Center, so an in-memory guard
// re-fires it every launch. Remembering the id across launches is what makes a
// notification route once — without it the app reopens the same task forever
// and, if that task fails to load, there is no way out of the screen.
const HANDLED_KEY = "push.lastHandledId"

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
  const { activeOrg, setActiveOrgId } = useOrg()
  const [pushEnabled] = useMMKVBoolean("push.enabled")

  useEffect(() => {
    // pushEnabled defaults to true (undefined) unless the user turned it off.
    if (isAuthenticated && activeOrg && pushEnabled !== false) void registerForPush(activeOrg.id)
  }, [isAuthenticated, activeOrg, pushEnabled])

  // A notification can be for a workspace the app is not currently in — the
  // inbox is per-org, but a push is not. Opening the entity without switching
  // first fetches it under the wrong org and reports it deleted or forbidden,
  // which is what "Couldn't open this task" was actually saying.
  const route = useCallback(
    (data: PushData | undefined) => {
      if (data?.org_id && data.org_id !== activeOrg?.id) setActiveOrgId(data.org_id)
      routeFromData(data)
    },
    [activeOrg?.id, setActiveOrgId],
  )

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
      route(response.notification.request.content.data as PushData | undefined)
    })
  }, [isAuthenticated, activeOrg, route])

  useEffect(() => {
    // Warm: tapped while the app is running, so the context is already up.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      storage.set(HANDLED_KEY, response.notification.request.identifier)
      route(response.notification.request.content.data as PushData | undefined)
    })
    return () => sub.remove()
  }, [route])

  return null
}
