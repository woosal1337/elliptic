import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { NotificationsScreen } from "@/screens/NotificationsScreen"
import { TriageScreen } from "@/screens/TriageScreen"
import { useAppTheme } from "@/theme/context"

import type { InboxStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<InboxStackParamList>()

export function InboxNavigator() {
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
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Triage" component={TriageScreen} options={{ title: "Triage" }} />
    </Stack.Navigator>
  )
}
