import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { StatusIcon, TaskStatus } from "@/components/StatusIcon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"

export interface SectionHeaderProps {
  title: string
  count?: number
  status?: TaskStatus
  /** Pass alongside `onToggle` to make the section collapsible. */
  collapsed?: boolean
  onToggle?: () => void
}

/**
 * A grouped-list section header: optional status glyph, uppercase title, count.
 *
 * Given `onToggle` it becomes the section's disclosure control; without one it
 * stays the plain, non-interactive label it was.
 */
export const SectionHeader: FC<SectionHeaderProps> = ({
  title,
  count,
  status,
  collapsed = false,
  onToggle,
}) => {
  const {
    theme: { colors },
  } = useAppTheme()

  const body = (
    <>
      {status ? <StatusIcon status={status} size={14} /> : null}
      <Text text={title} size="xs" weight="semiBold" style={[$title, { color: colors.textDim }]} />
      {count != null ? (
        <Text text={String(count)} size="xs" style={{ color: colors.textDim }} />
      ) : null}
      {onToggle ? (
        <>
          <View style={$spacer} />
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-down"}
            size={14}
            color={colors.textDim}
          />
        </>
      ) : null}
    </>
  )

  if (!onToggle) {
    return <View style={[$header, { backgroundColor: colors.background }]}>{body}</View>
  }

  return (
    <Pressable
      onPress={() => {
        hapticSelection()
        onToggle()
      }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded: !collapsed }}
      accessibilityHint={collapsed ? "Shows the tasks in this section" : "Hides them"}
      style={({ pressed }) => [
        $header,
        { backgroundColor: pressed ? colors.muted : colors.background },
      ]}
    >
      {body}
    </Pressable>
  )
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 24,
  paddingTop: 18,
  paddingBottom: 8,
}
const $spacer: ViewStyle = { flex: 1 }
const $title: TextStyle = { textTransform: "uppercase", letterSpacing: 0.5 }
