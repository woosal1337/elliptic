import { FC, ReactNode } from "react"
import { Pressable, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticPress } from "@/utils/haptics"

export interface ListRowProps {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
  onPress?: () => void
}

/** A tappable row with optional leading/trailing content — for tasks, notes, inbox. */
export const ListRow: FC<ListRowProps> = ({ title, subtitle, left, right, onPress }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()

  const $row = ({ pressed }: { pressed: boolean }): ViewStyle => ({
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    // lg, like every other row in the app (TaskRow, ProjectRow, the inbox and
    // notes rows). At md the leading avatar sat 8pt left of the screen heading
    // above it, which is the one place this row is used.
    paddingHorizontal: spacing.lg,
    // muted is the palette's pressed fill. neutral200 is darker than the
    // background in dark mode, so a press dimmed the row instead of lifting it.
    backgroundColor: pressed ? colors.muted : colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  })

  return (
    <Pressable onPress={hapticPress(onPress)} style={$row}>
      {left}
      <View style={$content}>
        <Text text={title} weight="medium" numberOfLines={1} />
        {subtitle ? (
          <Text text={subtitle} size="xs" style={{ color: colors.textDim }} numberOfLines={1} />
        ) : null}
      </View>
      {right}
    </Pressable>
  )
}

const $content: ViewStyle = { flex: 1, gap: 2 }
