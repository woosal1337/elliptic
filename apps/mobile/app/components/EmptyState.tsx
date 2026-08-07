import { FC } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

import { AppIcon, type IconName } from "@/components/AppIcon"
import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface EmptyStateProps {
  /** Optional glyph shown above the title. */
  icon?: IconName
  title: string
  caption?: string
  /** Optional call-to-action. */
  actionLabel?: string
  onAction?: () => void
}

/** A compact, centered empty state — used across every list screen. */
export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  caption,
  actionLabel,
  onAction,
}) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  return (
    <View style={$wrap}>
      {icon ? (
        <View style={[$iconWrap, { backgroundColor: colors.subtle, borderRadius: radius.full }]}>
          <AppIcon name={icon} size={26} color={colors.textDim} />
        </View>
      ) : null}
      <Text preset="subheading" text={title} style={[$center, { color: colors.text }]} />
      {caption ? <Text text={caption} style={[$centerSpaced, { color: colors.textDim }]} /> : null}
      {actionLabel && onAction ? (
        <Button
          text={actionLabel}
          preset="filled"
          onPress={onAction}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </View>
  )
}

const $wrap: ViewStyle = {
  flexGrow: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 48,
  paddingVertical: 64,
  gap: 4,
}
const $iconWrap: ViewStyle = {
  width: 56,
  height: 56,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
}
const $center: TextStyle = { textAlign: "center" }
const $centerSpaced: TextStyle = { textAlign: "center", marginTop: 4 }
