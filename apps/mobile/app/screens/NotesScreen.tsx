import { FC, useCallback, useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, TextStyle, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { OptionSheet } from "@/components/OptionSheet"
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
import { hapticPress, hapticSelection } from "@/utils/haptics"
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
  const [asFolder, setAsFolder] = useState(false)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [moving, setMoving] = useState<Note | null>(null)

  const byId = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  // The open folder can vanish underneath us — deleted on another device, or
  // moved out of this list — so fall back to the root rather than a blank screen.
  const currentId = folderId && byId.has(folderId) ? folderId : null

  const trail = useMemo(() => {
    const path: Note[] = []
    const seen = new Set<string>()
    let cursor = currentId
    while (cursor) {
      const node = byId.get(cursor)
      if (!node || seen.has(cursor)) break
      seen.add(cursor)
      path.unshift(node)
      cursor = node.parent_id
    }
    return path
  }, [currentId, byId])

  // Folders first, then documents: the things you walk into sit above the
  // things you open, the same way every file browser does it.
  const rows = useMemo(() => {
    const here = notes.filter((n) => (n.parent_id ?? null) === currentId)
    return [...here.filter((n) => n.is_folder), ...here.filter((n) => !n.is_folder)]
  }, [notes, currentId])

  const create = async () => {
    if (!activeOrg || !title.trim() || creating) return
    setCreating(true)
    // Whatever folder you are standing in is where it lands — that is the whole
    // point of being able to stand in one.
    const note = await api.createNote(activeOrg.id, title.trim(), {
      parentId: currentId,
      isFolder: asFolder,
    })
    setCreating(false)
    if (!note) return
    setTitle("")
    setShowCreate(false)
    invalidate(activeOrg.id, "notes")
    if (asFolder) setAsFolder(false)
    else navigation.navigate("NoteDetail", { noteId: note.id, title: note.title })
  }

  // Anywhere but itself, its own descendants, and where it already is — moving
  // a folder inside its own child would cut that branch off the tree.
  const moveTargets = useMemo(() => {
    if (!moving) return []
    const banned = new Set<string>([moving.id])
    let grew = true
    while (grew) {
      grew = false
      for (const n of notes) {
        if (n.parent_id && banned.has(n.parent_id) && !banned.has(n.id)) {
          banned.add(n.id)
          grew = true
        }
      }
    }
    const options = notes
      .filter((n) => n.is_folder && !banned.has(n.id) && n.id !== moving.parent_id)
      .map((n) => ({ label: n.title, value: n.id }))
    return moving.parent_id ? [{ label: "All notes", value: "" }, ...options] : options
  }, [moving, notes])

  const move = async (target: string) => {
    if (!activeOrg || !moving) return
    const ok = await api.moveNote(activeOrg.id, moving.id, target || null)
    setMoving(null)
    if (ok) invalidate(activeOrg.id, "notes")
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={["top"]}>
      <ScreenHeader
        title={trail.length > 0 ? trail[trail.length - 1].title : "Notes"}
        actions={
          activeOrg
            ? [
                {
                  key: "create",
                  icon: "plus",
                  label: "New",
                  emphasis: true,
                  onPress: () => setShowCreate(true),
                },
              ]
            : []
        }
      />

      {currentId ? (
        <Pressable
          onPress={hapticPress(() => setFolderId(trail[trail.length - 1]?.parent_id ?? null))}
          style={({ pressed }) => [
            $crumb,
            {
              paddingHorizontal: spacing.lg,
              backgroundColor: pressed ? colors.muted : colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <AppIcon name="chevron-left" size={16} color={colors.textDim} />
          <Text
            text={trail.length > 1 ? trail[trail.length - 2].title : "All notes"}
            size="xs"
            style={{ color: colors.textDim }}
            numberOfLines={1}
          />
        </Pressable>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.textDim}
              colors={[colors.textDim]}
            />
          }
          contentContainerStyle={rows.length === 0 ? $grow : $bottomClearance}
          ListEmptyComponent={
            <EmptyState
              icon={currentId ? "folder" : "file-text"}
              title={currentId ? "This folder is empty" : "No notes yet"}
              caption={
                currentId
                  ? "Anything you create in here is filed here."
                  : "Capture docs, specs, and meeting notes here."
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={hapticPress(() =>
                item.is_folder
                  ? setFolderId(item.id)
                  : navigation.navigate("NoteDetail", { noteId: item.id, title: item.title }),
              )}
              onLongPress={() => {
                hapticSelection()
                setMoving(item)
              }}
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
                <AppIcon
                  name={item.is_folder ? "folder" : "file-text"}
                  size={18}
                  color={colors.textDim}
                />
              )}
              <Text text={item.title} size="sm" weight="medium" numberOfLines={1} style={$title} />
              {item.is_folder ? (
                <AppIcon name="chevron-right" size={16} color={colors.textDim} />
              ) : null}
            </Pressable>
          )}
        />
      )}

      {activeOrg ? (
        <>
          <Sheet
            visible={showCreate}
            onClose={() => setShowCreate(false)}
            title={asFolder ? "New folder" : "New note"}
          >
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              <TextField
                value={title}
                onChangeText={setTitle}
                placeholder={asFolder ? "Folder name" : "Note title"}
                autoFocus
              />
              <Button
                text={creating ? "Creating…" : asFolder ? "Create folder" : "Create note"}
                preset="filled"
                disabled={!title.trim() || creating}
                onPress={() => void create()}
              />
              <Button
                text={asFolder ? "Make a note instead" : "Make a folder instead"}
                preset="default"
                disabled={creating}
                onPress={hapticPress(() => setAsFolder((v) => !v))}
              />
            </View>
          </Sheet>

          <OptionSheet
            visible={moving !== null}
            onClose={() => setMoving(null)}
            title={moving ? `Move ${moving.title}` : "Move"}
            options={moveTargets}
            onSelect={(value) => void move(value)}
          />
        </>
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
const $crumb: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingVertical: 10,
  borderBottomWidth: 1,
}
