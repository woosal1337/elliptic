/**
 * No-op modifiers for Android.
 *
 * SwiftUI modifiers describe how a SwiftUI view is decorated; there is nothing
 * for them to decorate here, and the Android components style themselves from
 * the theme directly. They are kept as functions with the same names so a
 * screen can pass `modifiers={[...]}` unchanged rather than branching on
 * platform at every call site — the array is simply ignored.
 */
type Modifier = { __noop: true }
// Accepts whatever the iOS signature takes and ignores it.
const noop = (..._args: unknown[]): Modifier => ({ __noop: true })

export const background = noop
export const disabled = noop
export const listRowBackground = noop
export const pickerStyle = noop
export const scrollContentBackground = noop
export const tag = noop
export const tint = noop
