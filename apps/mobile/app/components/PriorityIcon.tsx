import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { useAppTheme } from "@/theme/context"

export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent" | string

/**
 * Priority glyph. Signal bars (1/2/3 filled) for low/medium/high, a faint
 * three-bar rest state for none, and a filled alert badge for urgent —
 * mirroring the web's lucide Signal* / AlertOctagon treatment.
 */
export const PriorityIcon: FC<{ priority: TaskPriority; size?: number }> = ({
  priority,
  size = 16,
}) => {
  const {
    theme: { colors },
  } = useAppTheme()

  if (priority === "urgent") {
    const $badge: ViewStyle = {
      width: size,
      height: size,
      borderRadius: size * 0.28,
      backgroundColor: colors.priorityUrgent,
      alignItems: "center",
      justifyContent: "center",
    }
    return (
      <View style={$badge}>
        <AppIcon name="triangle-alert" size={size * 0.82} color={colors.onError} />
      </View>
    )
  }

  const level = priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0
  const active = level === 0 ? colors.priorityNone : priorityColor(priority, colors)
  const heights = [0.45, 0.7, 1]

  const bar = (h: number, i: number): ViewStyle => ({
    width: size * 0.2,
    height: size * h,
    borderRadius: 1,
    backgroundColor: i < level ? active : colors.priorityNone,
  })

  return (
    <View style={[$bars, { width: size, height: size }]}>
      {heights.map((h, i) => (
        <View key={i} style={bar(h, i)} />
      ))}
    </View>
  )
}

function priorityColor(
  priority: TaskPriority,
  colors: ReturnType<typeof useAppTheme>["theme"]["colors"],
) {
  switch (priority) {
    case "low":
      return colors.priorityLow
    case "medium":
      return colors.priorityMedium
    case "high":
      return colors.priorityHigh
    case "urgent":
      return colors.priorityUrgent
    default:
      return colors.priorityNone
  }
}

const $bars: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  justifyContent: "space-between",
}
