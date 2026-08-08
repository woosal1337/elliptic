import { FC, ReactNode } from "react"
import {
  Pressable,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native"
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect"

import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { hapticPress } from "@/utils/haptics"

/**
 * Liquid Glass building blocks (iOS 26). Everything here degrades to the themed
 * surfaces on older systems, so screens can use them unconditionally.
 *
 * Glass only reads as glass when something passes underneath — dock these over
 * content rather than stacking them in a column.
 */
export const LIQUID_GLASS = isLiquidGlassAvailable()

export { GlassContainer }

/** A glass panel: the backdrop for a docked bar. */
export const GlassSurface: FC<ViewProps & { clear?: boolean; interactive?: boolean }> = ({
  children,
  clear,
  interactive,
  style,
  ...props
}) => {
  const {
    theme: { colors },
    themeContext,
  } = useAppTheme()
  if (!LIQUID_GLASS) {
    return (
      <View style={[{ backgroundColor: colors.surface }, style]} {...props}>
        {children}
      </View>
    )
  }
  return (
    <GlassView
      style={style}
      glassEffectStyle={clear ? "clear" : "regular"}
      colorScheme={themeContext}
      isInteractive={interactive}
      {...props}
    >
      {children}
    </GlassView>
  )
}

/** A round glass control — composer actions, send, and friends. */
export const GlassIconButton: FC<{
  children: ReactNode
  onPress: () => void
  label: string
  testID?: string
  tint?: string
  size?: number
  disabled?: boolean
}> = ({ children, onPress, label, testID, tint, size = 36, disabled }) => {
  const {
    theme: { colors, radius },
    themeContext,
  } = useAppTheme()
  const shape: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  }
  return (
    <Pressable
      onPress={hapticPress(onPress)}
      disabled={disabled}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={disabled ? $disabled : undefined}
    >
      {LIQUID_GLASS ? (
        <GlassView
          style={shape}
          glassEffectStyle="regular"
          colorScheme={themeContext}
          tintColor={tint}
          isInteractive
        >
          {children}
        </GlassView>
      ) : (
        <View style={[shape, { backgroundColor: tint ?? colors.subtle }]}>{children}</View>
      )}
    </Pressable>
  )
}

/**
 * A glass text field that grows with its content.
 *
 * Ignite's TextField pins multiline inputs to a 112pt box, which reads as a
 * hole in a composer — this one starts at one line and grows to `maxHeight`.
 */
export const GlassField: FC<
  TextInputProps & { minHeight?: number; maxHeight?: number; containerStyle?: ViewStyle }
> = ({ minHeight = 38, maxHeight = 132, containerStyle, style, multiline, ...props }) => {
  const {
    theme: { colors, radius, spacing },
  } = useAppTheme()
  return (
    <GlassSurface
      clear
      style={[
        $field,
        // A capsule only reads right on one line; a growing field needs a card.
        {
          borderRadius: multiline ? radius.lg : radius.full,
          paddingHorizontal: spacing.sm,
          minHeight,
          maxHeight,
        },
        multiline && $fieldMultiline,
        !LIQUID_GLASS && [$bordered, { borderColor: colors.inputBorder }],
        containerStyle,
      ]}
    >
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.textDim}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          $input,
          { color: colors.text, maxHeight: maxHeight - 4 },
          multiline && $inputMultiline,
          style,
        ]}
        {...props}
      />
    </GlassSurface>
  )
}

const $disabled: ViewStyle = { opacity: 0.4 }
const $field: ViewStyle = { justifyContent: "center" }
// Multiline fields fill from the top rather than centring a growing block.
//
// No vertical padding here: the input already pads itself 9 above and below, so
// adding 4 more made a one-line field 46pt tall next to 38pt buttons — the
// field towered over the controls beside it. 9 + a 20pt line + 9 is 38, which
// is what the rest of the row is.
const $fieldMultiline: ViewStyle = { justifyContent: "flex-start" }
const $bordered: ViewStyle = { borderWidth: 1 }
const $input: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 15,
  paddingTop: 0,
  paddingBottom: 0,
}
const $inputMultiline: TextStyle = { paddingTop: 9, paddingBottom: 9 }
