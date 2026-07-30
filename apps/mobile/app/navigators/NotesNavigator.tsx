import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { NoteDetailScreen } from "@/screens/NoteDetailScreen"
import { NotesScreen } from "@/screens/NotesScreen"

import type { NotesStackParamList } from "./navigationTypes"
import { useStackScreenOptions } from "./stackScreenOptions"

const Stack = createNativeStackNavigator<NotesStackParamList>()

export function NotesNavigator() {
  const screenOptions = useStackScreenOptions()
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="NotesList"
        component={NotesScreen}
        options={{ headerShown: false, title: "Notes" }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  )
}
