import { FC, useCallback } from "react"
import { FlatList, RefreshControl, ViewStyle } from "react-native"

import { EmptyState } from "@/components/EmptyState"
import { ProjectRow } from "@/components/ProjectRow"
import { Screen } from "@/components/Screen"
import { ListSkeleton } from "@/components/Skeleton"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { Project } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { useListQuery } from "@/utils/useListQuery"

export const ProjectsScreen: FC<HomeStackScreenProps<"Projects">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors },
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
            icon="folder-open"
            title="No projects"
            caption="Projects you can access will appear here."
          />
        }
        renderItem={({ item }) => (
          <ProjectRow
            project={item}
            onPress={() =>
              navigation.navigate("ProjectDetail", { projectId: item.id, title: item.name })
            }
          />
        )}
      />
    </Screen>
  )
}

const $flex: ViewStyle = { flexGrow: 1 }
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
