import { FC, useEffect, useState } from "react"
import { FlatList, Pressable, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { SearchBar } from "@/components/SearchBar"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { SearchResult } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { openEntity } from "@/utils/openEntity"

const TYPE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  task: { label: "Task", icon: "checkbox-outline" },
  note: { label: "Note", icon: "document-text-outline" },
  project: { label: "Project", icon: "folder-outline" },
  meeting: { label: "Meeting", icon: "calendar-outline" },
  cycle: { label: "Cycle", icon: "repeat-outline" },
}

export const SearchScreen: FC<HomeStackScreenProps<"Search">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [q, setQ] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!activeOrg || q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const handle = setTimeout(() => {
      void api.search(activeOrg.id, q.trim()).then((r) => {
        setResults(r)
        setSearching(false)
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [q, activeOrg])

  const open = (r: SearchResult) => {
    if (r.type === "project") {
      navigation.navigate("ProjectDetail", { projectId: r.id, title: r.title })
      return
    }
    const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
    openEntity(parent, r.type, r.id, r.title)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={[$flex, { padding: spacing.lg }]}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search tasks, notes, projects…" autoFocus />
      <FlatList
        data={results}
        keyExtractor={(r) => `${r.type}:${r.id}`}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: spacing.sm }}
        contentContainerStyle={results.length === 0 ? $flex : undefined}
        ListEmptyComponent={
          q.trim().length < 2 ? (
            <EmptyState icon="search-outline" title="Search everything" caption="Find tasks, notes, and projects across your workspace." />
          ) : searching ? (
            <EmptyState title="Searching…" />
          ) : (
            <EmptyState icon="search-outline" title="No results" caption={`Nothing matched "${q.trim()}".`} />
          )
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] ?? { label: item.type, icon: "ellipse-outline" as const }
          return (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [
                $row,
                { backgroundColor: pressed ? colors.muted : colors.background, borderBottomColor: colors.separator },
              ]}
            >
              <Ionicons name={meta.icon} size={18} color={colors.textDim} />
              <View style={$grow}>
                <Text text={item.title} size="sm" weight="medium" numberOfLines={1} />
                <Text
                  text={item.snippet ? `${meta.label} · ${item.snippet}` : meta.label}
                  size="xs"
                  numberOfLines={1}
                  style={{ color: colors.textDim }}
                />
              </View>
            </Pressable>
          )
        }}
      />
    </Screen>
  )
}

const $flex: ViewStyle = { flexGrow: 1 }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  borderBottomWidth: 1,
}
const $grow: ViewStyle = { flex: 1, gap: 2 }
