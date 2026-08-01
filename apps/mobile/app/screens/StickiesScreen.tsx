import { FC, useCallback, useLayoutEffect, useState } from "react"
import { FlatList, Pressable, RefreshControl, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Sheet } from "@/components/Sheet"
import { ListSkeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useOrg } from "@/context/OrgContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { Sticky } from "@/services/api/types"
import { invalidate, queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { useListQuery } from "@/utils/useListQuery"

export const StickiesScreen: FC<ProfileStackScreenProps<"Stickies">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const fetcher = useCallback(
    () => (activeOrg ? api.listStickies(activeOrg.id) : Promise.resolve<Sticky[]>([])),
    [activeOrg],
  )
  const { data, loading, refreshing, refresh } = useListQuery<Sticky>(
    activeOrg ? queryKeys.stickies(activeOrg.id) : null,
    fetcher,
  )
  const [editing, setEditing] = useState<Sticky | "new" | null>(null)
  const [text, setText] = useState("")

  const openNew = () => {
    setText("")
    setEditing("new")
  }
  // Stickies keeps the native stack header, so Create lives in headerRight —
  // the same "create is always in the header" rule as the ScreenHeader screens.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        activeOrg ? (
          <Pressable
            testID="header-action-create"
            accessibilityRole="button"
            accessibilityLabel="New sticky"
            hitSlop={8}
            onPress={openNew}
          >
            <Ionicons name="add" size={24} color={colors.tint} />
          </Pressable>
        ) : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, activeOrg, colors.tint])
  const openEdit = (s: Sticky) => {
    setText(s.content)
    setEditing(s)
  }
  const save = async () => {
    if (!activeOrg || !editing) return
    if (editing === "new") {
      if (text.trim()) await api.createSticky(activeOrg.id, text.trim())
    } else {
      await api.updateSticky(activeOrg.id, editing.id, text.trim())
    }
    setEditing(null)
    invalidate(activeOrg.id, "stickies")
  }
  const del = (s: Sticky) => {
    if (!activeOrg) return
    void api.deleteSticky(activeOrg.id, s.id).then(() => invalidate(activeOrg.id, "stickies"))
  }
  const convert = (s: Sticky) => {
    if (!activeOrg) return
    void api.convertSticky(activeOrg.id, s.id).then(() => {
      invalidate(activeOrg.id, "stickies")
      invalidate(activeOrg.id, "tasks") // the converted sticky shows up as a task
    })
  }

  if (loading) {
    return (
      <Screen preset="fixed">
        <ListSkeleton rows={3} height={72} />
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex}>
      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[
          { padding: spacing.lg, gap: spacing.md },
          data.length === 0 ? $grow : $bottomClearance,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="reader-outline"
            title="No stickies yet"
            caption="Jot a quick thought and convert it into a task later."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)} style={[$card, { borderColor: colors.border }]}>
            <Text text={item.content || "Empty"} numberOfLines={4} />
            <View style={$actions}>
              <Pressable onPress={() => convert(item)} style={$action}>
                <Ionicons name="git-branch-outline" size={16} color={colors.textDim} />
                <Text text="To task" size="xxs" style={{ color: colors.textDim }} />
              </Pressable>
              <Pressable onPress={() => del(item)} style={$action}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New sticky" : "Edit sticky"}
      >
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder="Jot something…"
            multiline
            autoFocus
          />
          <Button text="Save" preset="filled" onPress={() => void save()} />
        </View>
      </Sheet>
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flexGrow: 1 }
// Let the last card scroll clear of the floating tab bar and any toast.
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
const $card: ViewStyle = { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }
const $actions: ViewStyle = { flexDirection: "row", justifyContent: "flex-end", gap: 16 }
const $action: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 }
