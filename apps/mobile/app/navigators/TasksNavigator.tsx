import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { TaskDetailScreen } from "@/screens/TaskDetailScreen"
import { TasksScreen } from "@/screens/TasksScreen"

import type { TasksStackParamList } from "./navigationTypes"
import { useStackScreenOptions } from "./stackScreenOptions"

const Stack = createNativeStackNavigator<TasksStackParamList>()

export function TasksNavigator() {
  const screenOptions = useStackScreenOptions()
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TasksList"
        component={TasksScreen}
        options={{ headerShown: false, title: "Tasks" }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  )
}
