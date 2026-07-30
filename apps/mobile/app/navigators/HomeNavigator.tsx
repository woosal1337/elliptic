import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ChatScreen } from "@/screens/ChatScreen"
import { HomeScreen } from "@/screens/HomeScreen"
import { ProjectDetailScreen } from "@/screens/ProjectDetailScreen"
import { ProjectsScreen } from "@/screens/ProjectsScreen"
import { SearchScreen } from "@/screens/SearchScreen"

import type { HomeStackParamList } from "./navigationTypes"
import { useStackScreenOptions } from "./stackScreenOptions"

const Stack = createNativeStackNavigator<HomeStackParamList>()

export function HomeNavigator() {
  const screenOptions = useStackScreenOptions()
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false, title: "Home" }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Assistant" }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
      <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: "Projects" }} />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  )
}
