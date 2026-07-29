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
 * Request notification permission, obtain the Expo push token, and register it with
 * the CompanyOS backend (COS-290). No-ops gracefully until an EAS projectId exists.
 */
export async function registerForPush(orgId: string): Promise<void> {
  if (!Device.isDevice) return

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
