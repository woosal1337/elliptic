import { FC } from "react"
import { Pressable, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"

/** Floating action button, bottom-right. */
export const Fab: FC<{
  onPress: () => void
  icon?: keyof typeof Ionicons.glyphMap
  label?: string
}> = ({ onPress, icon = "add", label = "Create" }) => {
  const {
    theme: { colors },
  } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[$fab, { backgroundColor: colors.tint, shadowColor: colors.text }]}
    >
      <Ionicons name={icon} size={28} color={colors.palette.neutral100} />
    </Pressable>
  )
}

const $fab: ViewStyle = {
  position: "absolute",
  right: 20,
  bottom: 24,
  width: 56,
  height: 56,
  borderRadius: 28,
  alignItems: "center",
  justifyContent: "center",
  elevation: 4,
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
}
