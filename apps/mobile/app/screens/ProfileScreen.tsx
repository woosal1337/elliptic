import { FC } from "react"
import { Alert, View, ViewStyle } from "react-native"
import { Button, Form, Host, Label, Section, Text as NativeText } from "@expo/ui/swift-ui"

import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

/**
 * Profile is a SwiftUI `Form`, like Settings — grouped rows, system labels with
 * SF Symbols, and a destructive button, all drawn by UIKit.
 */
export const ProfileScreen: FC<ProfileStackScreenProps<"ProfileMain">> = ({ navigation }) => {
  const { user, logout } = useAuth()
  const { activeOrg } = useOrg()
  const { themeContext } = useAppTheme()

  const confirmSignOut = () => {
    Alert.alert("Sign out", "You'll need to sign in again to use Elliptic.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ])
  }

  return (
    <View style={$fill}>
      <Host style={$fill} colorScheme={themeContext}>
        <Form>
          <Section title={user?.full_name ?? "Me"}>
            <NativeText>{user?.email ?? ""}</NativeText>
            {activeOrg ? <NativeText>{activeOrg.name}</NativeText> : null}
          </Section>

          <Section>
            <Button onPress={() => navigation.navigate("Settings")}>
              <Label title="Settings" systemImage="gearshape" />
            </Button>
          </Section>

          <Section>
            <Button role="destructive" label="Sign out" onPress={confirmSignOut} />
          </Section>
        </Form>
      </Host>
    </View>
  )
}

const $fill: ViewStyle = { flex: 1 }
