import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { NoteDetailScreen } from "@/screens/NoteDetailScreen"
import { NotesScreen } from "@/screens/NotesScreen"
import { useAppTheme } from "@/theme/context"

import type { NotesStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<NotesStackParamList>()

export function NotesNavigator() {
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
      <Stack.Screen name="NotesList" component={NotesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  )
}
