import { FC, useCallback, useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, TextStyle, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ListSkeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useDocumentViewer } from "@/context/DocumentViewer"
import { useOrg } from "@/context/OrgContext"
import type { NotesStackScreenProps } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { DriveFile } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { hapticPress } from "@/utils/haptics"
import { useListQuery } from "@/utils/useListQuery"

/** The folders sitting directly inside `current`, read off the paths files carry. */
function childFolders(files: readonly DriveFile[], current: string): string[] {
  const prefix = current ? `${current}/` : ""
  const names = new Set<string>()
  for (const file of files) {
    const path = file.folder_path
    if (!path) continue
    if (current && !path.startsWith(prefix)) continue
    const head = path.slice(prefix.length).split("/")[0]
    if (head) names.add(head)
  }
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function humanSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Row =
  | { kind: "folder"; key: string; name: string; path: string }
  | { kind: "file"; key: string; file: DriveFile }

/**
 * The organisation's Drive, read-only on the phone.
 *
 * Uploading is left to the web app on purpose: the documents that go in here are
 * contracts and plans that arrive on a computer, and a phone picker adds a
 * permission prompt and a background-upload story for a case nobody asked for.
 * What the phone needs is the other half — being able to read the document a
 * task description points at, wherever you happen to be. Tapping one opens it in
 * a {@link DocumentSheet}, not in the browser: the reader stays in the task.
 */
export const DriveScreen: FC<NotesStackScreenProps<"Drive">> = ({ navigation, route }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const viewer = useDocumentViewer()
  const [search, setSearch] = useState("")

  const folder = route.params?.folderPath ?? ""

  const cacheKey = activeOrg ? queryKeys.drive(activeOrg.id) : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listDriveFiles(activeOrg.id) : Promise.resolve<DriveFile[]>([])),
    [activeOrg],
  )
  const { data: files, loading, refreshing, refresh } = useListQuery<DriveFile>(cacheKey, fetcher)

  const query = search.trim().toLowerCase()

  const rows = useMemo<Row[]>(() => {
    if (query) {
      return files
        .filter(
          (file) =>
            file.name.toLowerCase().includes(query) ||
            (file.description ?? "").toLowerCase().includes(query),
        )
        .map((file) => ({ kind: "file" as const, key: file.id, file }))
    }
    const folders: Row[] = childFolders(files, folder).map((name) => ({
      kind: "folder" as const,
      key: `folder:${name}`,
      name,
      path: folder ? `${folder}/${name}` : name,
    }))
    const here: Row[] = files
      .filter((file) => file.folder_path === folder)
      .map((file) => ({ kind: "file" as const, key: file.id, file }))
    return [...folders, ...here]
  }, [files, folder, query])

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={[]}>
      <View style={[$search, { paddingHorizontal: spacing.md, paddingTop: spacing.sm }]}>
        <TextField
          placeholder="Search documents"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search documents"
        />
      </View>

      {loading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
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
              icon={query ? "search" : "paperclip"}
              title={
                query ? "No documents match" : folder ? "This folder is empty" : "No documents yet"
              }
              caption={
                query
                  ? "Try a shorter search."
                  : "Upload contracts, plans and specs from the web app, then link them in a task description."
              }
            />
          }
          renderItem={({ item }) =>
            item.kind === "folder" ? (
              <Pressable
                onPress={hapticPress(() =>
                  navigation.push("Drive", { folderPath: item.path, title: item.name }),
                )}
                accessibilityRole="button"
                accessibilityLabel={`Folder ${item.name}`}
                style={({ pressed }) => [
                  $row,
                  {
                    backgroundColor: pressed ? colors.muted : colors.background,
                    borderBottomColor: colors.separator,
                  },
                ]}
              >
                <View style={$lead}>
                  <AppIcon name="folder" size={18} color={colors.textDim} />
                </View>
                <Text text={item.name} size="sm" weight="medium" numberOfLines={1} style={$flex} />
                <AppIcon name="chevron-right" size={16} color={colors.textDim} />
              </Pressable>
            ) : (
              <Pressable
                onPress={hapticPress(() => viewer.open(item.file.id, item.file.name))}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.file.name}`}
                style={({ pressed }) => [
                  $row,
                  {
                    backgroundColor: pressed ? colors.muted : colors.background,
                    borderBottomColor: colors.separator,
                  },
                ]}
              >
                <View style={$lead}>
                  <AppIcon
                    name={item.file.kind === "image" ? "image" : "file-text"}
                    size={18}
                    color={colors.textDim}
                  />
                </View>
                <View style={$flex}>
                  <Text text={item.file.name} size="sm" weight="medium" numberOfLines={1} />
                  <Text
                    text={
                      [
                        query && item.file.folder_path ? item.file.folder_path : null,
                        humanSize(item.file.size_bytes),
                      ]
                        .filter(Boolean)
                        .join(" · ") || item.file.filename
                    }
                    size="xxs"
                    style={[$dim, { color: colors.textDim }]}
                    numberOfLines={1}
                  />
                </View>
                <AppIcon name="chevron-right" size={16} color={colors.textDim} />
              </Pressable>
            )
          }
        />
      )}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flexGrow: 1 }
// The tab bar floats over the list, so the last row needs somewhere to end.
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
const $search: ViewStyle = { paddingBottom: 8 }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 1,
}
const $lead: ViewStyle = { width: 24, alignItems: "center" }
const $dim: TextStyle = { marginTop: 1 }
