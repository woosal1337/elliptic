import { FC, useCallback } from "react"
import { FlatList, Pressable, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { AppIcon, type IconName } from "@/components/AppIcon"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { SearchBar } from "@/components/SearchBar"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { SearchResult } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { openEntity } from "@/utils/openEntity"
import { useDebouncedSearch } from "@/utils/useDebouncedSearch"

const TYPE_META: Record<string, { label: string; icon: IconName }> = {
  task: { label: "Task", icon: "square-check" },
  note: { label: "Note", icon: "file-text" },
  project: { label: "Project", icon: "folder" },
  meeting: { label: "Meeting", icon: "calendar" },
}

export const SearchScreen: FC<HomeStackScreenProps<"Search">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const runSearch = useCallback(
    (query: string) =>
      activeOrg ? api.search(activeOrg.id, query) : Promise.resolve<SearchResult[]>([]),
    [activeOrg],
  )
  const {
    query: q,
    setQuery: setQ,
    results,
    searching,
  } = useDebouncedSearch<SearchResult>(runSearch)

  const open = (r: SearchResult) => {
    if (r.type === "project") {
      navigation.navigate("ProjectDetail", { projectId: r.id, title: r.title })
      return
    }
    const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
    openEntity(parent, r.type, r.id, r.title)
  }

  return (
    // Horizontal padding sits on the bar and the rows rather than the screen, so
    // the row separators reach both edges the way every other list's do. Inset
    // here, they were the only ones in the app that stopped short.
    <Screen preset="fixed" contentContainerStyle={[$flex, { paddingVertical: spacing.lg }]}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Search tasks, notes, projects…"
          autoFocus
          loading={searching}
          onCancel={() => navigation.goBack()}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(r) => `${r.type}:${r.id}`}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: spacing.sm }}
        contentContainerStyle={results.length === 0 ? $flex : $bottomClearance}
        ListEmptyComponent={
          q.trim().length < 2 ? (
            <EmptyState
              icon="search"
              title="Search everything"
              caption="Find tasks, notes, and projects across your workspace."
            />
          ) : searching ? (
            <EmptyState title="Searching…" />
          ) : (
            <EmptyState
              icon="search"
              title="No results"
              caption={`Nothing matched "${q.trim()}".`}
            />
          )
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] ?? {
            label: item.type,
            icon: "circle" as const,
          }
          return (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [
                $row,
                {
                  backgroundColor: pressed ? colors.muted : colors.background,
                  borderBottomColor: colors.separator,
                },
              ]}
            >
              <AppIcon name={meta.icon} size={18} color={colors.textDim} />
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
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  // lg, the inset every other row in the app uses.
  paddingHorizontal: 24,
  borderBottomWidth: 1,
}
const $grow: ViewStyle = { flex: 1, gap: 2 }
