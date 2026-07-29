import { FC } from "react"
import { ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { ListRow } from "@/components/ListRow"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

export const ProfileScreen: FC<ProfileStackScreenProps<"ProfileMain">> = ({ navigation }) => {
  const { user, logout } = useAuth()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <Screen preset="auto" contentContainerStyle={{ padding: spacing.lg }} safeAreaEdges={["top"]}>
      <Text preset="heading" text={user?.full_name ?? "Me"} />
      <Text text={user?.email ?? ""} style={{ marginTop: spacing.xs, marginBottom: spacing.lg }} />

      <ListRow
        title="Stickies"
        left={<Ionicons name="document-outline" size={20} color={colors.textDim} />}
        onPress={() => navigation.navigate("Stickies")}
      />
      <ListRow
        title="Settings"
        left={<Ionicons name="settings-outline" size={20} color={colors.textDim} />}
        onPress={() => navigation.navigate("Settings")}
      />

      <Button text="Sign out" onPress={logout} style={$signout} />
    </Screen>
  )
}

const $signout: ViewStyle = { marginTop: 24 }
