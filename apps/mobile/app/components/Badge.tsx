import { FC } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger"

export interface BadgeProps {
  text: string
  variant?: BadgeVariant
}

/** A small status pill. */
export const Badge: FC<BadgeProps> = ({ text, variant = "neutral" }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()

  const tones: Record<BadgeVariant, { fg: string; bg: string }> = {
    neutral: { fg: colors.textDim, bg: colors.subtle },
    accent: { fg: colors.tint, bg: colors.accentMuted },
    success: { fg: colors.success, bg: colors.successBackground },
    warning: { fg: colors.warning, bg: colors.warningBackground },
    danger: { fg: colors.error, bg: colors.errorBackground },
  }
  const tone = tones[variant]

  const $pill: ViewStyle = {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
    borderRadius: 999,
    backgroundColor: tone.bg,
  }
  const $label: TextStyle = { color: tone.fg, fontSize: 12 }

  return (
    <View style={$pill}>
      <Text text={text} weight="medium" style={$label} />
    </View>
  )
}
