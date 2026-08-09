/**
 * Compile-time proof that each platform-split module pair exports the same names.
 *
 * Metro resolves `@/components/form` to `index.ios.tsx` or `index.android.tsx`,
 * but TypeScript resolves it to `index.tsx`, which re-exports the Android one.
 * So a primitive that exists on Android and not on iOS typechecks perfectly,
 * passes lint, passes the tests, and then renders `undefined` on a device.
 *
 * That is not hypothetical: the iOS Profile tab crashed with "Element type is
 * invalid" because this directory exported the text primitive as `NativeText`
 * on iOS and `Text` on Android, while every screen imports `Text`. Nothing in
 * CI could see it, and the Android emulator was perfectly happy.
 *
 * Nothing imports this module — it exists only so `tsc` fails, naming the
 * missing export, when the two sides of a pair drift apart again. Add a pair
 * here whenever a new `*.ios.*` / `*.android.*` module is introduced.
 */
import * as FormAndroid from "./index.android"
import * as FormIOS from "./index.ios"
import * as ModifiersAndroid from "./modifiers.android"
import * as ModifiersIOS from "./modifiers.ios"
import * as NavAndroid from "../../navigators/MainNavigator.android"
import * as NavIOS from "../../navigators/MainNavigator.ios"

/**
 * `true` when the two modules export exactly the same names; otherwise the
 * names one side is missing. The constraint lives on `Assert` rather than here
 * so it is checked where the pair is named — at a generic definition TypeScript
 * cannot yet see the concrete keys and would reject every use.
 */
type SameSurface<A, B> = [Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>] extends [never]
  ? true
  : Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>

/** Fails with the offending export names in the message. */
type Assert<T extends true> = T

export type FormPair = Assert<SameSurface<typeof FormAndroid, typeof FormIOS>>
export type ModifiersPair = Assert<SameSurface<typeof ModifiersAndroid, typeof ModifiersIOS>>
export type NavigatorPair = Assert<SameSurface<typeof NavAndroid, typeof NavIOS>>
