import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import type { TaskLabel } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"

/**
 * A neutral label chip with a color dot tinted by the label's own color —
 * matching the web (border + surface bg + 6px dot).
 */
export const LabelChip: FC<{ label: TaskLabel }> = ({ label }) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  return (
    <View
      style={[
        $chip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs,
        },
      ]}
    >
      <View style={[$dot, { backgroundColor: label.color || colors.textDim }]} />
      <Text text={label.name} size="xxs" style={{ color: colors.textDim }} numberOfLines={1} />
    </View>
  )
}

/** A wrapping row of label chips. */
export const LabelRow: FC<{ labels?: TaskLabel[] }> = ({ labels }) => {
  if (!labels?.length) return null
  return (
    <View style={$row}>
      {labels.map((l) => (
        <LabelChip key={l.id} label={l} />
      ))}
    </View>
  )
}

const $chip: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  height: 22,
  borderWidth: 1,
}
const $dot: ViewStyle = { width: 6, height: 6, borderRadius: 3 }
const $row: ViewStyle = { flexDirection: "row", flexWrap: "wrap", gap: 6 }
