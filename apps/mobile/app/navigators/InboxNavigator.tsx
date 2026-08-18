import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { NotificationsScreen } from "@/screens/NotificationsScreen"

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
    </Stack.Navigator>
  )
}
