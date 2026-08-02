import { FC } from "react"
import { Pressable, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

/** A tappable labeled field that opens a picker (used in create/edit sheets). */
export const FieldRow: FC<{
  label: string
  value: string
  onPress: () => void
  muted?: boolean
}> = ({ label, value, onPress, muted }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[$row, { borderBottomColor: colors.separator, paddingVertical: spacing.sm }]}
    >
      <Text text={label} size="xs" style={{ color: colors.textDim }} />
      <View style={$valWrap}>
        <Text
          text={value}
          numberOfLines={1}
          style={{ color: muted ? colors.textDim : colors.text }}
        />
        <AppIcon name="chevron-right" size={16} color={colors.textDim} />
      </View>
    </Pressable>
  )
}

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottomWidth: 1,
}
const $valWrap: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "62%" }
