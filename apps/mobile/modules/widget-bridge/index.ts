import { requireOptionalNativeModule } from "expo"

/**
 * The native side of the app → widget bridge.
 *
 * Optional on purpose: the module only exists on iOS, and a build made before
 * it was added will not have it. Every caller must handle `null` rather than
 * assume the bridge is there.
 */
interface WidgetBridgeModule {
  /** False when the App Group suite cannot be opened — usually a missing entitlement. */
  setItem: (group: string, key: string, value: string) => boolean
  getItem: (group: string, key: string) => string | null
  /** Reload one widget kind, or all of them when omitted. */
  reload: (kind?: string | null) => void
}

export const WidgetBridge = requireOptionalNativeModule<WidgetBridgeModule>("WidgetBridge")
