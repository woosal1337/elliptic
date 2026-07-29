import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ProfileScreen } from "@/screens/ProfileScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { StickiesScreen } from "@/screens/StickiesScreen"
import { useAppTheme } from "@/theme/context"

import type { ProfileStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  const {
    theme: { colors },
  } = useAppTheme()
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Stickies" component={StickiesScreen} options={{ title: "Stickies" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  )
}
