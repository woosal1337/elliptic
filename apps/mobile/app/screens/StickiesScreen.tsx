import { FC, useCallback, useState } from "react"
import { FlatList, Pressable, RefreshControl, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { Fab } from "@/components/Fab"
import { Screen } from "@/components/Screen"
import { Sheet } from "@/components/Sheet"
import { Skeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useOrg } from "@/context/OrgContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Sticky } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { useCachedList } from "@/utils/useCachedList"

export const StickiesScreen: FC<ProfileStackScreenProps<"Stickies">> = () => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const fetcher = useCallback(
    () => (activeOrg ? api.listStickies(activeOrg.id) : Promise.resolve<Sticky[]>([])),
    [activeOrg],
  )
  const { data, loading, refreshing, refresh } = useCachedList<Sticky>(
    activeOrg ? `stickies:${activeOrg.id}` : null,
    fetcher,
  )
  const [editing, setEditing] = useState<Sticky | "new" | null>(null)
  const [text, setText] = useState("")

  const openNew = () => {
    setText("")
    setEditing("new")
  }
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
    refresh()
  }
  const del = (s: Sticky) => {
    if (activeOrg) void api.deleteSticky(activeOrg.id, s.id).then(refresh)
  }
  const convert = (s: Sticky) => {
    if (activeOrg) void api.convertSticky(activeOrg.id, s.id).then(refresh)
  }

  if (loading) {
    return (
      <Screen preset="fixed" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={72} />
        ))}
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex}>
      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={$empty}>
            <Text text="No stickies yet." style={{ color: colors.textDim }} />
          </View>
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

      {activeOrg ? <Fab onPress={openNew} /> : null}

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
const $empty: ViewStyle = { padding: 48, alignItems: "center" }
const $card: ViewStyle = { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }
const $actions: ViewStyle = { flexDirection: "row", justifyContent: "flex-end", gap: 16 }
const $action: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 }
