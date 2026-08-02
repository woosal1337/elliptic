import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { useAppTheme } from "@/theme/context"

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled"
  | string

/**
 * Linear-style status glyph. A small circle whose fill/border/inner-dot
 * encodes progress: dashed backlog → outlined todo → partially-filled
 * in-progress/in-review → solid check for done → muted × for cancelled.
 */
export const StatusIcon: FC<{ status: TaskStatus; size?: number }> = ({ status, size = 16 }) => {
  const {
    theme: { colors },
  } = useAppTheme()

  const color = statusColor(status, colors)
  const ring: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center",
    justifyContent: "center",
  }

  if (status === "done") {
    return (
      <View style={[ring, { backgroundColor: color }]}>
        <AppIcon name="check" size={size * 0.68} color={colors.onTint} />
      </View>
    )
  }
  if (status === "cancelled") {
    return (
      <View style={[ring, { backgroundColor: color }]}>
        <AppIcon name="x" size={size * 0.68} color={colors.onTint} />
      </View>
    )
  }

  // backlog / todo / in_progress / in_review are outlined circles with an
  // increasingly-filled center.
  const innerRatio = status === "in_review" ? 0.62 : status === "in_progress" ? 0.42 : 0
  return (
    <View
      style={[
        ring,
        {
          borderWidth: 1.6,
          borderColor: color,
          borderStyle: status === "backlog" ? "dashed" : "solid",
        },
      ]}
    >
      {innerRatio > 0 ? (
        <View
          style={{
            width: size * innerRatio,
            height: size * innerRatio,
            borderRadius: (size * innerRatio) / 2,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  )
}

function statusColor(
  status: TaskStatus,
  colors: ReturnType<typeof useAppTheme>["theme"]["colors"],
) {
  switch (status) {
    case "todo":
      return colors.statusTodo
    case "in_progress":
      return colors.statusInProgress
    case "in_review":
      return colors.statusInReview
    case "done":
      return colors.statusDone
    case "cancelled":
      return colors.statusCancelled
    case "backlog":
    default:
      return colors.statusBacklog
  }
}
