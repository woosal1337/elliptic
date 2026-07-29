import { FC, useCallback, useState } from "react"
import { FlatList, Pressable, RefreshControl, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { Fab } from "@/components/Fab"
import { Screen } from "@/components/Screen"
import { Sheet } from "@/components/Sheet"
import { Skeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useOrg } from "@/context/OrgContext"
import type { NotesStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Note } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { useCachedList } from "@/utils/useCachedList"

export const NotesScreen: FC<NotesStackScreenProps<"NotesList">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const cacheKey = activeOrg ? `notes:${activeOrg.id}` : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listNotes(activeOrg.id) : Promise.resolve<Note[]>([])),
    [activeOrg],
  )
  const { data: notes, loading, refreshing, refresh } = useCachedList<Note>(cacheKey, fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)

  const createNote = async () => {
    if (!activeOrg || !title.trim() || creating) return
    setCreating(true)
    const note = await api.createNote(activeOrg.id, title.trim())
    setCreating(false)
    if (note) {
      setTitle("")
      setShowCreate(false)
      refresh()
      navigation.navigate("NoteDetail", { noteId: note.id, title: note.title })
    }
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={["top"]}>
      <Text preset="heading" text="Notes" style={{ padding: spacing.lg }} />
      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
          }
          contentContainerStyle={notes.length === 0 ? $grow : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No notes yet"
              caption="Capture docs, specs, and meeting notes here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate("NoteDetail", { noteId: item.id, title: item.title })}
              style={({ pressed }) => [
                $row,
                { backgroundColor: pressed ? colors.muted : colors.background, borderBottomColor: colors.separator },
              ]}
            >
              {item.icon ? (
                <Text text={item.icon} style={{ fontSize: 18 }} />
              ) : (
                <Ionicons name="document-text-outline" size={18} color={colors.textDim} />
              )}
              <Text text={item.title} size="sm" weight="medium" numberOfLines={1} style={$grow} />
            </Pressable>
          )}
        />
      )}

      {activeOrg ? (
        <>
          <Fab onPress={() => setShowCreate(true)} />
          <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="New note">
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              <TextField value={title} onChangeText={setTitle} placeholder="Note title" autoFocus />
              <Button
                text={creating ? "Creating…" : "Create note"}
                preset="filled"
                disabled={!title.trim() || creating}
                onPress={() => void createNote()}
              />
            </View>
          </Sheet>
        </>
      ) : null}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flexGrow: 1 }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 13,
  paddingHorizontal: 24,
  borderBottomWidth: 1,
}
