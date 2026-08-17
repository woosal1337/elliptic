import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, TextStyle, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { InlineMarkdown } from "@/components/InlineMarkdown"
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

export const NotesScreen: FC<NotesStackScreenProps<"NotesList">> = ({ navigation, route }) => {
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
  const [moving, setMoving] = useState<Note | null>(null)
  const folderId = route.params?.folderId ?? null

  const byId = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  // The open folder can vanish underneath us — deleted on another device, or
  // moved out of this list. Falling back to the root would silently show the
  // wrong contents under the folder's name, so pop back instead.
  const known = folderId === null || byId.has(folderId)
  const currentId = known ? folderId : null
  useEffect(() => {
    if (!known && !loading) navigation.goBack()
  }, [known, loading, navigation])

  // Folders first, then documents: the things you walk into sit above the
  // things you open, the same way every file browser does it.
  //
  // Folders sort by name, numerically, so the date-named week folders come out
  // 07-20, 07-27, 08-03 rather than in whatever order the API returned them.
  // Documents keep the API's order, which is recency and is what you want.
  const rows = useMemo(() => {
    const here = notes.filter((n) => (n.parent_id ?? null) === currentId)
    const folders = here
      .filter((n) => n.is_folder)
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
    return [...folders, ...here.filter((n) => !n.is_folder)]
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

  // Inside a folder the in-screen header is gone, so the create action moves to
  // the native header rather than disappearing with it.
  useLayoutEffect(() => {
    if (currentId === null) return
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={hapticPress(() => setShowCreate(true))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="New note or folder"
        >
          <AppIcon name="plus" size={22} color={colors.text} />
        </Pressable>
      ),
    })
  }, [currentId, navigation, colors.text])

  const move = async (target: string) => {
    if (!activeOrg || !moving) return
    const ok = await api.moveNote(activeOrg.id, moving.id, target || null)
    setMoving(null)
    if (ok) invalidate(activeOrg.id, "notes")
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={$flex}
      safeAreaEdges={currentId === null ? ["top"] : []}
    >
      {currentId === null ? (
        <ScreenHeader
          title="Notes"
          actions={
            activeOrg
              ? [
                  {
                    key: "drive",
                    icon: "paperclip",
                    label: "Drive",
                    onPress: () => navigation.push("Drive", {}),
                  },
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
                  ? navigation.push("NotesList", { folderId: item.id, title: item.title })
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
              {/* Fixed-width column: an emoji at 18pt is wider than an 18pt
                  icon, so laid out at its natural width it pushed the title of
                  every emoji row a few points right of the plain ones. */}
              <View style={$lead}>
                {item.icon ? (
                  <Text text={item.icon} style={$emoji} />
                ) : (
                  <AppIcon
                    name={item.is_folder ? "folder" : "file-text"}
                    size={18}
                    color={colors.textDim}
                  />
                )}
              </View>
              <InlineMarkdown
                text={item.title}
                size="sm"
                weight="medium"
                numberOfLines={1}
                style={$title}
              />
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
const $lead: ViewStyle = { width: 18, alignItems: "center" }
const $emoji: TextStyle = { fontSize: 18, textAlign: "center" }
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
