/**
 * Thin, safe wrapper around expo-haptics.
 *
 * Every call is wrapped so a missing native module (e.g. before a native
 * rebuild, or on web) degrades to a no-op instead of throwing.
 */
import * as Haptics from "expo-haptics"

function safe(fn: () => Promise<unknown> | void) {
  try {
    const r = fn()
    if (r && typeof (r as Promise<unknown>).catch === "function") {
      ;(r as Promise<unknown>).catch(() => {})
    }
  } catch {
    // no-op — haptics are non-essential polish
  }
}

/** Light tick for selection changes (segmented control, picker rows, tab press). */
export function hapticSelection() {
  safe(() => Haptics.selectionAsync())
}

/** Success confirmation (task completed, status → done). */
export function hapticSuccess() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}

/** Warning / destructive confirmation (delete, decline). */
export function hapticWarning() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
}

/** Medium impact (swipe action commit, sheet snap). */
export function hapticImpact() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

export const haptics = {
  selection: hapticSelection,
  success: hapticSuccess,
  warning: hapticWarning,
  impact: hapticImpact,
}
