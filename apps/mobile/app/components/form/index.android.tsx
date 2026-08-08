import { Children, FC, isValidElement, ReactElement, ReactNode, useState } from "react"
import { Platform, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { Switch } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Sheet as AppSheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { TextField as AppTextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import { hapticPress } from "@/utils/haptics"

import type {
  ButtonProps,
  FormProps,
  FormTextFieldProps,
  FormTextProps,
  HostProps,
  PickerProps,
  SectionProps,
  ToggleProps,
} from "./types"
import type { BottomSheetProps, DatePickerProps } from "./types"

/**
 * Android implementations of the grouped-form primitives.
 *
 * `@expo/ui/swift-ui` is iOS-only, and it does not degrade — Fabric cannot find
 * `ViewManagerAdapter_ExpoUI_SectionView` and takes the whole app down with it,
 * including neighbouring screens the tab navigator has pre-rendered. So Android
 * gets real components rather than a guard around the crash.
 *
 * The file is split by platform rather than branching on `Platform.OS` inside
 * one module: Metro then never resolves the iOS package into the Android bundle
 * at all, so there is no native dependency to be missing in the first place.
 *
 * The API mirrors the SwiftUI one exactly, so a screen imports from
 * `@/components/form` and reads the same on both platforms.
 */

/** A grouped list, the way iOS Settings and Android's preference screens both read. */
export const Form: FC<FormProps> = ({ children }) => {
  const {
    theme: { colors },
  } = useAppTheme()
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={$formContent}>
      {children}
    </ScrollView>
  )
}

/** On iOS `Host` bridges into SwiftUI. Android has nothing to bridge to. */
export const Host: FC<HostProps> = ({ children, style }) => {
  // These screens carry no navigation header, so nothing else insets them and
  // the first row drew under the clock. SwiftUI's Host handles this on iOS.
  const insets = useSafeAreaInsets()
  return <View style={[style, { paddingTop: insets.top }]}>{children}</View>
}

/**
 * A titled group of rows.
 *
 * The title sits outside the card, uppercase-free and dim, which is how both
 * platforms label a settings group — shouting it in caps costs legibility at
 * this size for no gain.
 */
export const Section: FC<SectionProps> = ({ title, children }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <View style={{ marginTop: spacing.lg }}>
      {title ? (
        <Text
          text={title}
          size="xs"
          weight="medium"
          style={[$sectionTitle, { color: colors.textDim, paddingHorizontal: spacing.lg }]}
        />
      ) : null}
      <View style={[$card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  )
}

/**
 * A labelled switch row.
 *
 * `thumbColor` is set explicitly rather than left to the platform: Android's
 * default thumb is white, and this theme's tint is near-white, so the two
 * together produced the same unreadable switch that had to be fixed on iOS.
 */
export const Toggle: FC<ToggleProps> = ({ label, isOn, onIsOnChange }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <View style={[$row, { paddingHorizontal: spacing.lg, borderBottomColor: colors.separator }]}>
      <Text text={label} size="sm" style={$grow} />
      <Switch
        value={isOn}
        onValueChange={onIsOnChange}
        trackColor={{ false: colors.subtle, true: colors.textDim }}
        thumbColor={colors.surface}
      />
    </View>
  )
}

/** A full-width row that acts. `destructive` is the only role that reads differently. */
export const Button: FC<ButtonProps> = ({ label, onPress, role, disabled }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const danger = role === "destructive"
  return (
    <Pressable
      onPress={disabled ? undefined : hapticPress(onPress)}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        $row,
        {
          paddingHorizontal: spacing.lg,
          borderBottomColor: colors.separator,
          backgroundColor: pressed ? colors.muted : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        text={label}
        size="sm"
        weight={danger ? "medium" : undefined}
        style={{ color: danger ? colors.error : colors.text }}
      />
    </Pressable>
  )
}

/**
 * A segmented choice.
 *
 * Rendered as a row of segments rather than a dropdown, matching the SwiftUI
 * `.segmented` style the iOS side asks for, so the two platforms present the
 * same decision the same way.
 */
export const Picker: FC<PickerProps> = ({ label, selection, onSelectionChange, children }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  // Options arrive as children whose value lives in a `tag()` modifier. That
  // modifier is a no-op here, so the value is taken from the child's key, which
  // the screens already set to the same string.
  const options = Children.toArray(children).filter(isValidElement) as ReactElement<{
    children?: ReactNode
  }>[]
  return (
    <View style={[$pickerBlock, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
      {label ? <Text text={label} size="sm" /> : null}
      <View style={[$segments, { backgroundColor: colors.subtle }]}>
        {options.map((option) => {
          const value = String(option.key ?? "").replace(/^\.\$/, "")
          const active = value === selection
          return (
            <Pressable
              key={value}
              onPress={hapticPress(() => onSelectionChange?.(value))}
              style={[$segment, active && { backgroundColor: colors.surface }]}
            >
              <Text
                size="xs"
                weight={active ? "medium" : undefined}
                style={{ color: active ? colors.text : colors.textDim }}
              >
                {option.props.children}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** Text inside a form row; also used as a Picker option. */
export const NativeText: FC<FormTextProps> = ({ children }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <View style={[$row, { paddingHorizontal: spacing.lg, borderBottomColor: colors.separator }]}>
      <Text size="sm" style={{ color: colors.text }}>
        {children}
      </Text>
    </View>
  )
}

/** A form field that reports edits as they happen, like the SwiftUI one. */
export const TextField: FC<FormTextFieldProps> = ({
  defaultValue,
  placeholder,
  onValueChange,
  axis,
}) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <View style={[$fieldBlock, { paddingHorizontal: spacing.lg }]}>
      <AppTextField
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChangeText={onValueChange}
        multiline={axis === "vertical"}
        style={{ borderColor: colors.inputBorder }}
      />
    </View>
  )
}

export { NativeText as Text }

const $formContent: ViewStyle = { paddingBottom: Platform.OS === "android" ? 24 : 0 }
const $sectionTitle: TextStyle = { marginBottom: 6 }
const $card: ViewStyle = { borderRadius: 12, borderWidth: 1, overflow: "hidden" }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  minHeight: 48,
  paddingVertical: 10,
  borderBottomWidth: 1,
}
const $grow: ViewStyle = { flex: 1 }
const $pickerBlock: ViewStyle = { gap: 8 }
const $fieldBlock: ViewStyle = { paddingVertical: 6 }
const $segments: ViewStyle = { flexDirection: "row", borderRadius: 10, padding: 3 }
const $segment: ViewStyle = {
  flex: 1,
  alignItems: "center",
  paddingVertical: 7,
  borderRadius: 8,
}

/**
 * A modal sheet.
 *
 * The app already has a `Sheet` with the right look and dismiss behaviour, so
 * this only adapts the SwiftUI prop names onto it rather than growing a second
 * modal implementation to keep in step.
 */
export const BottomSheet: FC<BottomSheetProps> = ({
  isPresented,
  onIsPresentedChange,
  children,
}) => (
  <AppSheet visible={Boolean(isPresented)} onClose={() => onIsPresentedChange?.(false)}>
    {children}
  </AppSheet>
)

/**
 * A date field.
 *
 * Android's picker is a dialog rather than an inline wheel, so the row shows the
 * current date and opens the platform dialog on press — which is what an Android
 * user expects, and avoids embedding a control that has no inline form here.
 */
export const DatePicker: FC<DatePickerProps> = ({ title, selection, onDateChange }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [open, setOpen] = useState(false)
  const value = selection ?? new Date()
  return (
    <>
      <Pressable
        onPress={hapticPress(() => setOpen(true))}
        style={({ pressed }) => [
          $row,
          {
            paddingHorizontal: spacing.lg,
            borderBottomColor: colors.separator,
            backgroundColor: pressed ? colors.muted : "transparent",
          },
        ]}
      >
        <Text text={title ?? "Date"} size="sm" style={$grow} />
        <Text text={value.toISOString().slice(0, 10)} size="sm" style={{ color: colors.textDim }} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode="date"
          onChange={(_event, date) => {
            setOpen(false)
            if (date) onDateChange?.(date)
          }}
        />
      ) : null}
    </>
  )
}
