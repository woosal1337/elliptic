import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ChatScreen } from "@/screens/ChatScreen"
import { HomeScreen } from "@/screens/HomeScreen"
import { ProjectDetailScreen } from "@/screens/ProjectDetailScreen"
import { ProjectsScreen } from "@/screens/ProjectsScreen"
import { SearchScreen } from "@/screens/SearchScreen"
import { useAppTheme } from "@/theme/context"

import type { HomeStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<HomeStackParamList>()

export function HomeNavigator() {
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
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
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
