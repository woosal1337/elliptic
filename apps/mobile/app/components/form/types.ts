import type { ReactNode } from "react"
import type { StyleProp, ViewStyle } from "react-native"

/**
 * The shared surface of the grouped-form primitives.
 *
 * Both platform files implement exactly this, so a screen imports from
 * `@/components/form` and never learns which one it got. iOS delegates to
 * SwiftUI for a genuinely native feel; Android builds the same shapes out of
 * plain components, because the SwiftUI package has no Android side at all.
 */
export interface HostProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  matchContents?: boolean
  /** iOS passes the SwiftUI host its colour scheme; Android styles from theme. */
  colorScheme?: string
}

export interface FormProps {
  children?: ReactNode
  /** iOS-only SwiftUI modifiers; ignored on Android. */
  modifiers?: unknown[]
}

export interface SectionProps {
  title?: string
  children?: ReactNode
  modifiers?: unknown[]
}

export interface ToggleProps {
  label: string
  isOn: boolean
  onIsOnChange: (value: boolean) => void
  modifiers?: unknown[]
}

export interface ButtonProps {
  label: string
  onPress?: () => void
  role?: "destructive" | "default"
  disabled?: boolean
  modifiers?: unknown[]
}

export interface PickerProps {
  label?: string
  /** The tag of the selected child. */
  selection?: string
  onSelectionChange?: (value: string) => void
  /** Each child is a labelled option carrying its tag in `modifiers`. */
  children?: ReactNode
  modifiers?: unknown[]
}

export interface FormTextProps {
  children?: ReactNode
  /** Carries `tag(value)` when used as a Picker option. */
  modifiers?: unknown[]
}

export interface FormTextFieldProps {
  defaultValue?: string
  placeholder?: string
  onValueChange?: (value: string) => void
  modifiers?: unknown[]
}
