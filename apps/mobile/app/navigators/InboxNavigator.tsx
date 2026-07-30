import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { NotificationsScreen } from "@/screens/NotificationsScreen"
import { TriageScreen } from "@/screens/TriageScreen"

import type { InboxStackParamList } from "./navigationTypes"
import { useStackScreenOptions } from "./stackScreenOptions"

const Stack = createNativeStackNavigator<InboxStackParamList>()

export function InboxNavigator() {
  const screenOptions = useStackScreenOptions()
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false, title: "Inbox" }}
      />
      <Stack.Screen name="Triage" component={TriageScreen} options={{ title: "Triage" }} />
    </Stack.Navigator>
  )
}
