import { FC, useCallback } from "react"
import { FlatList, Pressable, RefreshControl, TextStyle, View, ViewStyle } from "react-native"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ListSkeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import { TAB_BAR_CLEARANCE } from "@/navigators/FloatingTabBar"
import type { HomeStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Project } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { useListQuery } from "@/utils/useListQuery"

const TILE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#14b8a6",
]
function tileColor(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TILE_COLORS[h % TILE_COLORS.length]
}

export const ProjectsScreen: FC<HomeStackScreenProps<"Projects">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, radius },
  } = useAppTheme()
  const fetcher = useCallback(
    () => (activeOrg ? api.listProjects(activeOrg.id) : Promise.resolve<Project[]>([])),
    [activeOrg],
  )
  const { data, loading, refreshing, refresh } = useListQuery<Project>(
    activeOrg ? queryKeys.projects(activeOrg.id) : null,
    fetcher,
  )

  if (loading) {
    return (
      <Screen preset="fixed">
        <ListSkeleton height={48} />
      </Screen>
    )
  }

  return (
    <Screen preset="fixed">
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={data.length === 0 ? $flex : $bottomClearance}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No projects"
            caption="Projects you can access will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("ProjectDetail", { projectId: item.id, title: item.name })
            }
            style={({ pressed }) => [
              $row,
              {
                backgroundColor: pressed ? colors.muted : colors.background,
                borderBottomColor: colors.separator,
              },
            ]}
          >
            <View
              style={[
                $tile,
                { backgroundColor: tileColor(item.key || item.name), borderRadius: radius.md },
              ]}
            >
              <Text
                text={(item.key || item.name).charAt(0).toUpperCase()}
                style={[$tileLetter, { color: colors.onTint }]}
              />
            </View>
            <View style={$grow}>
              <Text text={item.name} size="sm" weight="medium" numberOfLines={1} />
              <Text text={item.key} style={[$projectKey, { color: colors.textDim }]} />
            </View>
          </Pressable>
        )}
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
  paddingHorizontal: 24,
  borderBottomWidth: 1,
}
const $tile: ViewStyle = { width: 36, height: 36, alignItems: "center", justifyContent: "center" }
const $grow: ViewStyle = { flex: 1, gap: 2 }
const $tileLetter: TextStyle = { fontFamily: typography.display.bold, fontSize: 16 }
const $projectKey: TextStyle = { fontFamily: typography.code.normal, fontSize: 11 }
