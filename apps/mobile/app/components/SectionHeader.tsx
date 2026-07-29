import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { StatusIcon, TaskStatus } from "@/components/StatusIcon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

/** A grouped-list section header: optional status glyph, uppercase title, count. */
export const SectionHeader: FC<{ title: string; count?: number; status?: TaskStatus }> = ({
  title,
  count,
  status,
}) => {
  const {
    theme: { colors },
  } = useAppTheme()
  return (
    <View style={[$header, { backgroundColor: colors.background }]}>
      {status ? <StatusIcon status={status} size={14} /> : null}
      <Text
        text={title}
        size="xs"
        weight="semiBold"
        style={{ color: colors.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}
      />
      {count != null ? (
        <Text text={String(count)} size="xs" style={{ color: colors.textDim }} />
      ) : null}
    </View>
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
