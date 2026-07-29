import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { TaskDetailScreen } from "@/screens/TaskDetailScreen"
import { TasksScreen } from "@/screens/TasksScreen"
import { useAppTheme } from "@/theme/context"

import type { TasksStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<TasksStackParamList>()

export function TasksNavigator() {
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
      <Stack.Screen name="TasksList" component={TasksScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  )
}
