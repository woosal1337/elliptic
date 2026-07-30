import { FC, useCallback } from "react"
import { SectionList, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { TaskListSkeleton } from "@/components/Skeleton"
import { TaskRow } from "@/components/TaskRow"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Task } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { openEntity } from "@/utils/openEntity"
import { prettyLabel, STATUS_OPTIONS } from "@/utils/taskOptions"
import { useListQuery } from "@/utils/useListQuery"

const ORDER = ["in_progress", "in_review", "todo", "backlog", "done", "cancelled"]

export const ProjectDetailScreen: FC<HomeStackScreenProps<"ProjectDetail">> = ({
  route,
  navigation,
}) => {
  const { projectId } = route.params
  const { activeOrg } = useOrg()
  const fetcher = useCallback(
    () => (activeOrg ? api.listProjectTasks(activeOrg.id, projectId) : Promise.resolve<Task[]>([])),
    [activeOrg, projectId],
  )
  const { data, loading } = useListQuery<Task>(
    activeOrg ? queryKeys.projectTasks(activeOrg.id, projectId) : null,
    fetcher,
  )

  const sections = ORDER.map((status) => ({
    status,
    title: prettyLabel(status, STATUS_OPTIONS),
    data: data.filter((t) => t.status === status),
  })).filter((s) => s.data.length > 0)

  const open = (t: Task) => {
    const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
    openEntity(parent, "task", t.id, t.identifier)
  }

  if (loading) {
    return (
      <Screen preset="fixed">
        <TaskListSkeleton rows={4} />
      </Screen>
    )
  }

  return (
    <Screen preset="fixed">
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? $flex : undefined}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            status={section.status}
            title={section.title}
            count={section.data.length}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No tasks yet"
            caption="Tasks in this project will show up here."
          />
        }
        renderItem={({ item }) => <TaskRow task={item} onPress={() => open(item)} />}
      />
    </Screen>
  )
}

const $flex: ViewStyle = { flexGrow: 1 }
