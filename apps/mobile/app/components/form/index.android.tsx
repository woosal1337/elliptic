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
          style={[
            $sectionTitle,
            {
              color: colors.textDim,
              // The card's own inset plus a row's padding, so the title starts
              // exactly where the labels inside the card do. At `lg` alone it
              // sat 16pt to their left and the page read as two ragged rails.
              paddingHorizontal: spacing.md + spacing.lg,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          $card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            // SwiftUI's Form insets its sections from the screen edge; without
            // this the cards ran the full width and sat against both bezels.
            marginHorizontal: spacing.md,
          },
        ]}
      >
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
      {/* The thumb is white in both themes, as Material's own is. Left to
          the platform it comes out teal, which is its accent and not ours.
          Given a dark colour it looked clipped — it was not: the thumb was
          blending into the dark track and only the contrasting sliver showed.
          The track is mid-grey in both themes, so white reads against it. */}
      <Switch
        value={isOn}
        onValueChange={onIsOnChange}
        trackColor={{ false: colors.subtle, true: colors.textDim }}
        thumbColor={SWITCH_THUMB}
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
  // Past four, equal-width segments are narrower than their own labels and the
  // text wraps mid-word — the seven task statuses came out as "Backlo/g" and
  // "In prog/ress". Beyond that count the segments size to their labels and the
  // track scrolls instead, which is what a status picker needs anyway.
  const scrolls = options.length > 4

  const segments = options.map((option) => {
    const value = String(option.key ?? "").replace(/^\.\$/, "")
    const active = value === selection
    return (
      <Pressable
        key={value}
        onPress={hapticPress(() => onSelectionChange?.(value))}
        style={[
          $segment,
          scrolls ? $segmentIntrinsic : $segmentEven,
          active && { backgroundColor: colors.surface },
        ]}
      >
        <Text
          size="xs"
          weight={active ? "medium" : undefined}
          numberOfLines={1}
          style={{ color: active ? colors.text : colors.textDim }}
        >
          {option.props.children}
        </Text>
      </Pressable>
    )
  })

  return (
    <View style={[$pickerBlock, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
      {label ? <Text text={label} size="sm" /> : null}
      {scrolls ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // flexGrow on the content container floors it at the viewport width,
          // so a set that happens to fit (the five priorities) still stretches
          // across the row instead of stopping short of the right edge. One that
          // does not (the seven statuses) overflows this and scrolls.
          contentContainerStyle={[$segments, $fillTrack, { backgroundColor: colors.subtle }]}
        >
          {segments}
        </ScrollView>
      ) : (
        <View style={[$segments, { backgroundColor: colors.subtle }]}>{segments}</View>
      )}
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

/**
 * A form field that reports edits as they happen, like the SwiftUI one.
 *
 * Drawn borderless and flush with the row inset. Boxed, its text started 13pt
 * (border plus the input's own margin) right of every other value in the same
 * card, so an editable name did not line up with the read-only rows beneath it.
 * SwiftUI's Form field is borderless for the same reason.
 */
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
    <View
      style={[$fieldBlock, { paddingHorizontal: spacing.lg, borderBottomColor: colors.separator }]}
    >
      <AppTextField
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChangeText={onValueChange}
        multiline={axis === "vertical"}
        inputWrapperStyle={$flushWrapper}
        style={$flushInput}
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
// Not from the palette: a switch thumb is white on every Android app, and
// both themes put a mid-grey track behind it.
const SWITCH_THUMB = "#FFFFFF"

const $grow: ViewStyle = { flex: 1 }
const $pickerBlock: ViewStyle = { gap: 8 }
// Matches $row's height and separator so a field reads as one of the rows.
const $fieldBlock: ViewStyle = {
  justifyContent: "center",
  minHeight: 48,
  // 8, not $row's 10: the input carries its own 4pt vertical margin, so the
  // two together land the field on the same 48pt height as a plain row.
  paddingVertical: 8,
  borderBottomWidth: 1,
}
const $flushWrapper: ViewStyle = {
  borderWidth: 0,
  borderRadius: 0,
  backgroundColor: "transparent",
}
// The input's own 12pt side margin is what pushed the text off the row inset.
const $flushInput: TextStyle = { marginHorizontal: 0 }
const $segments: ViewStyle = { flexDirection: "row", borderRadius: 10, padding: 3 }
const $segment: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 7,
  borderRadius: 8,
}
// Few enough options to share the width evenly, the way a segmented control does.
const $segmentEven: ViewStyle = { flex: 1 }
// Too many: each takes at least the width its label needs, sharing any slack.
// flexGrow without flexBasis grows from the intrinsic width, so a label is
// never squeezed below its own text.
const $segmentIntrinsic: ViewStyle = { flexGrow: 1, paddingHorizontal: 12 }
const $fillTrack: ViewStyle = { flexGrow: 1 }

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
