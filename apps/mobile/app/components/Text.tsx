import { ReactNode, forwardRef, ForwardedRef } from "react"
// eslint-disable-next-line no-restricted-imports
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native"
import { TOptions } from "i18next"

import { isRTL, TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemedStyleArray } from "@/theme/types"
import { typography } from "@/theme/typography"

type Sizes = keyof typeof $sizeStyles
type Weights = keyof typeof typography.primary
type Presets = "default" | "bold" | "heading" | "subheading" | "formLabel" | "formHelper"

export interface TextProps extends RNTextProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TxKeyPath
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: string
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TOptions
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<TextStyle>
  /**
   * One of the different types of text presets.
   */
  preset?: Presets
  /**
   * Text weight modifier.
   */
  weight?: Weights
  /**
   * Text size modifier.
   */
  size?: Sizes
  /**
   * Children components.
   */
  children?: ReactNode
}

/**
 * For your text displaying needs.
 * This component is a HOC over the built-in React Native one.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Text/}
 * @param {TextProps} props - The props for the `Text` component.
 * @returns {JSX.Element} The rendered `Text` component.
 */
export const Text = forwardRef(function Text(props: TextProps, ref: ForwardedRef<RNText>) {
  const { weight, size, tx, txOptions, text, children, style: $styleOverride, ...rest } = props
  const { themed } = useAppTheme()

  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children

  const preset: Presets = props.preset ?? "default"
  const $styles: StyleProp<TextStyle> = [
    $rtlStyle,
    themed($presets[preset]),
    weight && $fontWeightStyles[weight],
    size && $sizeStyles[size],
    $styleOverride,
  ]

  return (
    <RNText {...rest} style={$styles} ref={ref}>
      {content}
    </RNText>
  )
})

// Brand type scale (ported from the web design tokens). Negative tracking
// scales with size; small/caption sit near zero.
const $sizeStyles = {
  xxl: { fontSize: 32, lineHeight: 38, letterSpacing: -0.8 } satisfies TextStyle, // h1
  xl: { fontSize: 24, lineHeight: 30, letterSpacing: -0.6 } satisfies TextStyle, // h2
  lg: { fontSize: 20, lineHeight: 28, letterSpacing: -0.4 } satisfies TextStyle, // h3
  md: { fontSize: 17, lineHeight: 24, letterSpacing: -0.2 } satisfies TextStyle, // h4
  sm: { fontSize: 15, lineHeight: 22, letterSpacing: -0.1 } satisfies TextStyle, // body
  xs: { fontSize: 13, lineHeight: 19 } satisfies TextStyle, // small
  xxs: { fontSize: 12, lineHeight: 17 } satisfies TextStyle, // caption
}

const $fontWeightStyles = Object.entries(typography.primary).reduce((acc, [weight, fontFamily]) => {
  return { ...acc, [weight]: { fontFamily } }
}, {}) as Record<Weights, TextStyle>

// Inter Tight display weights, for titles/headings.
const $displayStyles = {
  medium: { fontFamily: typography.display.medium } satisfies TextStyle,
  semiBold: { fontFamily: typography.display.semiBold } satisfies TextStyle,
  bold: { fontFamily: typography.display.bold } satisfies TextStyle,
}

const $baseStyle: ThemedStyle<TextStyle> = (theme) => ({
  ...$sizeStyles.sm,
  ...$fontWeightStyles.normal,
  color: theme.colors.text,
})

const $presets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  default: [$baseStyle],
  bold: [$baseStyle, { ...$fontWeightStyles.semiBold }],
  heading: [
    $baseStyle,
    {
      ...$sizeStyles.xxl,
      ...$displayStyles.bold,
    },
  ],
  subheading: [$baseStyle, { ...$sizeStyles.lg, ...$displayStyles.semiBold }],
  formLabel: [$baseStyle, { ...$sizeStyles.xs, ...$fontWeightStyles.medium }],
  formHelper: [$baseStyle, { ...$sizeStyles.xs, ...$fontWeightStyles.normal }],
}
const $rtlStyle: TextStyle = isRTL ? { writingDirection: "rtl" } : {}

/**
 * The type scale and display faces, for the few places that need to render text
 * outside a `Text` — a `TextInput` editing a value has to match the `Text` that
 * displays it, or the font visibly swaps on tap.
 */
export const textSizeStyles = $sizeStyles
export const displayFontStyles = $displayStyles
