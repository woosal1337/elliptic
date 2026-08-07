import { FC } from "react"
import { Pressable, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"

import { AppIcon } from "@/components/AppIcon"
import { Avatar } from "@/components/Avatar"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { hapticPress } from "@/utils/haptics"

/** Opens the workspace picker, which the root stack presents as a native sheet. */
export const OrgSwitcher: FC = () => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const navigation = useNavigation<AppStackScreenProps<"Main">["navigation"]>()

  return (
    <Pressable
      onPress={hapticPress(() => navigation.navigate("SwitchWorkspace"))}
      accessibilityRole="button"
      accessibilityLabel="Switch workspace"
      style={[$trigger, { gap: spacing.xs }]}
    >
      <Avatar name={activeOrg?.name ?? "?"} size={24} />
      <Text text={activeOrg?.name ?? "Select workspace"} weight="medium" />
      <AppIcon name="chevron-down" size={16} color={colors.textDim} />
    </Pressable>
  )
}

const $trigger: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
}
