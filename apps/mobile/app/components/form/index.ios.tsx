/**
 * iOS keeps the real SwiftUI controls.
 *
 * This file exists so the import path is the same on both platforms; Metro
 * picks it for iOS and the Android sibling otherwise. Nothing here is a
 * wrapper — re-exporting keeps the native behaviour, including the modifiers
 * the screens already pass.
 */
export {
  BottomSheet,
  Button,
  DatePicker,
  Form,
  Host,
  Picker,
  Section,
  TextField,
  Toggle,
} from "@expo/ui/swift-ui"
// Both names, because the Android sibling exports both and the screens import
// `Text`. Exporting only `NativeText` here is what made the iOS Profile tab
// render `undefined` — see `parity.type-test.ts` for the check that now catches
// this class of drift at compile time.
export { Text, Text as NativeText } from "@expo/ui/swift-ui"
export type * from "./types"
