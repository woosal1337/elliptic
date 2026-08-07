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
    paddingHorizontal: spacing.md,
    backgroundColor: pressed ? colors.palette.neutral200 : colors.background,
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
