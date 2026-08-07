import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ProfileScreen } from "@/screens/ProfileScreen"

import type { ProfileStackParamList } from "./navigationTypes"
import { useStackScreenOptions } from "./stackScreenOptions"

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  const screenOptions = useStackScreenOptions()
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false, title: "Profile" }}
      />
    </Stack.Navigator>
  )
}
