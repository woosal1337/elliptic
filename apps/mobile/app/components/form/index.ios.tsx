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
export { Text as NativeText } from "@expo/ui/swift-ui"
export type * from "./types"
