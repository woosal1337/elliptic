import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
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
      {/* The glyph is a step smaller than the row's, so the header stays
          subordinate — but it is centred in a column the width of the row's
          glyph. Laid out at its own width the header title landed at x=46
          against the rows' x=52, and the whole section read as ragged. */}
      {status ? (
        <View style={$glyph}>
          <StatusIcon status={status} size={14} />
        </View>
      ) : null}
      <Text text={title} size="xs" weight="semiBold" style={[$title, { color: colors.textDim }]} />
      {count != null ? (
        <Text text={String(count)} size="xs" style={{ color: colors.textDim }} />
      ) : null}
      {onToggle ? (
        <>
          <View style={$spacer} />
          <AppIcon
            name={collapsed ? "chevron-right" : "chevron-down"}
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

// The gap above a section is margin, not padding. As padding it sat inside the
// Pressable, so the pressed fill drew 18px above the label and 8px below it —
// a highlight visibly off-centre from the row it belongs to. Same total
// spacing, but now the fill is symmetric around the content.
const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 24,
  paddingVertical: 8,
  marginTop: 10,
}
// TaskRow's StatusIcon is 16 wide with a 12 gap after it. Matching the column
// width puts both glyphs on the same centre line; the extra 4 makes up the gap
// difference so both titles start at x=52. It is added here rather than on
// `gap` so the space between the title and its count stays at 8.
const $glyph: ViewStyle = { width: 16, alignItems: "center", marginRight: 4 }
const $spacer: ViewStyle = { flex: 1 }
// Set in the label's own case. Uppercasing shouts, and at this size it also
// costs legibility — "In Progress" reads faster than "IN PROGRESS".
const $title: TextStyle = { letterSpacing: -0.1 }
