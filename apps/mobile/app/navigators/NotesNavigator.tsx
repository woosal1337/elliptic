import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { DriveScreen } from "@/screens/DriveScreen"
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
        // The root keeps its large in-screen header; a folder uses the native
        // one, which is what carries the back button and the swipe-back.
        options={({ route }) => ({
          headerShown: Boolean(route.params?.folderId),
          title: route.params?.title ?? "Notes",
        })}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Stack.Screen
        name="Drive"
        component={DriveScreen}
        options={({ route }) => ({ headerShown: true, title: route.params?.title ?? "Drive" })}
      />
    </Stack.Navigator>
  )
}
