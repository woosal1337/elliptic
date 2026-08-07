import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Avatar } from "@/components/Avatar"
import { PriorityIcon } from "@/components/PriorityIcon"
import { StatusIcon } from "@/components/StatusIcon"
import { Text } from "@/components/Text"
import type { Task } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { hapticPress } from "@/utils/haptics"

/** Is an ISO date string strictly before today (local)? */
function isOverdue(due?: string | null): boolean {
  if (!due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + "T00:00:00")
  return d.getTime() < today.getTime()
}

function shortDue(due: string): string {
  const d = new Date(due + "T00:00:00")
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/**
 * The core task list unit: status glyph, mono identifier, title, and
 * right-aligned priority / due / assignee metadata. One dense, tappable row.
 */
export const TaskRow: FC<{
  task: Task
  onPress?: () => void
  assigneeName?: string | null
}> = ({ task, onPress, assigneeName }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()

  const overdue = isOverdue(task.due_date)
  const dotCount = task.labels?.length ?? 0

  const $row = ({ pressed }: { pressed: boolean }): ViewStyle => ({
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    backgroundColor: pressed ? colors.muted : colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  })

  const $mono: TextStyle = {
    fontFamily: typography.code.normal,
    fontSize: 11,
    color: colors.textDim,
  }

  return (
    <Pressable onPress={hapticPress(onPress)} style={$row}>
      <StatusIcon status={task.status} />

      <View style={$center}>
        <Text text={task.title} size="sm" weight="medium" numberOfLines={1} />
        <View style={$sub}>
          <Text text={task.identifier} style={$mono} />
          {dotCount > 0 ? (
            <View style={$dots}>
              {task.labels!.slice(0, 3).map((l) => (
                <View
                  key={l.id}
                  style={[$labelDot, { backgroundColor: l.color || colors.textDim }]}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={$right}>
        {task.due_date ? (
          <Text
            text={shortDue(task.due_date)}
            style={[$due, { color: overdue ? colors.error : colors.textDim }]}
          />
        ) : null}
        {task.priority && task.priority !== "none" ? (
          <PriorityIcon priority={task.priority} size={14} />
        ) : null}
        {assigneeName ? <Avatar name={assigneeName} size={22} /> : null}
      </View>
    </Pressable>
  )
}

const $center: ViewStyle = { flex: 1, gap: 3 }
const $sub: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 }
const $dots: ViewStyle = { flexDirection: "row", gap: 3 }
const $labelDot: ViewStyle = { width: 6, height: 6, borderRadius: 3 }
const $right: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 10 }
// The due date sits a step below body text so the title leads the row.
const $due: TextStyle = { fontSize: 12 }
