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

/**
 * Wrap a press handler so it ticks before running.
 *
 * Lives here, and is applied inside the shared row/button primitives rather than
 * at each call site, so a new screen gets feedback by building out of the same
 * components instead of by remembering. Returns undefined when handed undefined,
 * which keeps `onPress={undefined}` meaning "not pressable" — wrapping it would
 * make inert rows tick.
 */
export function hapticPress<A extends unknown[]>(
  fn: ((...args: A) => void) | undefined,
  tick: () => void = hapticSelection,
): ((...args: A) => void) | undefined {
  if (!fn) return undefined
  return (...args: A) => {
    tick()
    fn(...args)
  }
}

export const haptics = {
  selection: hapticSelection,
  success: hapticSuccess,
  warning: hapticWarning,
  impact: hapticImpact,
}
