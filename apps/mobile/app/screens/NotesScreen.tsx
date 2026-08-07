import { FC, useCallback, useState } from "react"
import { FlatList, Pressable, RefreshControl, TextStyle, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ScreenHeader } from "@/components/ScreenHeader"
import { Sheet } from "@/components/Sheet"
import { ListSkeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useOrg } from "@/context/OrgContext"
import type { NotesStackScreenProps } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { Note } from "@/services/api/types"
import { invalidate, queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { useListQuery } from "@/utils/useListQuery"

export const NotesScreen: FC<NotesStackScreenProps<"NotesList">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const cacheKey = activeOrg ? queryKeys.notes(activeOrg.id) : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listNotes(activeOrg.id) : Promise.resolve<Note[]>([])),
    [activeOrg],
  )
  const { data: notes, loading, refreshing, refresh } = useListQuery<Note>(cacheKey, fetcher)
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
      invalidate(activeOrg.id, "notes")
      navigation.navigate("NoteDetail", { noteId: note.id, title: note.title })
    }
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={["top"]}>
      <ScreenHeader
        title="Notes"
        actions={
          activeOrg
            ? [
                {
                  key: "create",
                  icon: "plus",
                  label: "New note",
                  emphasis: true,
                  onPress: () => setShowCreate(true),
                },
              ]
            : []
        }
      />
      {loading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.textDim}
              colors={[colors.textDim]}
            />
          }
          contentContainerStyle={notes.length === 0 ? $grow : $bottomClearance}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title="No notes yet"
              caption="Capture docs, specs, and meeting notes here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("NoteDetail", { noteId: item.id, title: item.title })
              }
              style={({ pressed }) => [
                $row,
                {
                  backgroundColor: pressed ? colors.muted : colors.background,
                  borderBottomColor: colors.separator,
                },
              ]}
            >
              {item.icon ? (
                <Text text={item.icon} style={$emoji} />
              ) : (
                <AppIcon name="file-text" size={18} color={colors.textDim} />
              )}
              <Text text={item.title} size="sm" weight="medium" numberOfLines={1} style={$title} />
            </Pressable>
          )}
        />
      )}

      {activeOrg ? (
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
      ) : null}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $emoji: TextStyle = { fontSize: 18 }
const $grow: ViewStyle = { flexGrow: 1 }
// flexShrink is 0 by default in RN, so flexGrow alone lets a long title overrun
// the row's padding and ellipsize at the screen edge instead of the margin.
const $title: ViewStyle = { flex: 1 }
// Let the last row scroll clear of the floating tab bar and any toast.
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 13,
  paddingHorizontal: 24,
  borderBottomWidth: 1,
}
