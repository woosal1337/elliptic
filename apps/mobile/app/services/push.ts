import { Platform } from "react-native"
import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"

import { api } from "@/services/api"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * The channels the API addresses its pushes to. Android files every notification
 * under a channel and lets the user set importance per channel, so this is what
 * lets someone mute the board chatter without losing an @mention. A push whose
 * channelId does not exist on the device is dropped outright, so these have to
 * be registered before the first one arrives.
 *
 * Importance is only the default: once a channel exists, Android hands control
 * of it to the user and ignores later changes from us.
 */
const CHANNELS = [
  { id: "direct", name: "Mentions & assignments", importance: Notifications.AndroidImportance.MAX },
  { id: "comments", name: "Comments", importance: Notifications.AndroidImportance.DEFAULT },
  { id: "activity", name: "Board activity", importance: Notifications.AndroidImportance.DEFAULT },
] as const

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== "android") return
  await Promise.all(
    CHANNELS.map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        importance: c.importance,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      }),
    ),
  )
}

/**
 * Request notification permission, obtain the Expo push token, and register it with
 * the Elliptic backend (COS-290). No-ops gracefully until an EAS projectId exists.
 */
export async function registerForPush(orgId: string): Promise<void> {
  if (!Device.isDevice) return
  await ensureChannels()

  // PermissionResponse carries `granted` at runtime; cast around a types mismatch.
  let granted = ((await Notifications.getPermissionsAsync()) as { granted: boolean }).granted
  if (!granted) {
    granted = ((await Notifications.requestPermissionsAsync()) as { granted: boolean }).granted
  }
  if (!granted) return

  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  const projectId = extra?.eas?.projectId

  let token: string
  try {
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    token = result.data
  } catch {
    // Expo push needs an EAS projectId (run `eas init`); register once configured.
    return
  }

  await api.registerDevice(orgId, Platform.OS === "ios" ? "ios" : "android", token)
}
