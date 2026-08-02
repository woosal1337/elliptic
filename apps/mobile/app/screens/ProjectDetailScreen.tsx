import { FC, useCallback, useState } from "react"
import { SectionList, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { TaskListSkeleton } from "@/components/Skeleton"
import { TaskRow } from "@/components/TaskRow"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
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

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const toggle = (status: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(status)) next.add(status)
      return next
    })

  // `count` is the real size; `data` empties when collapsed so the section keeps
  // its header while its rows disappear.
  const sections = ORDER.map((status) => {
    const rows = data.filter((t) => t.status === status)
    return {
      status,
      title: prettyLabel(status, STATUS_OPTIONS),
      count: rows.length,
      data: collapsed.has(status) ? [] : rows,
    }
  }).filter((s) => s.count > 0)

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
        contentContainerStyle={sections.length === 0 ? $flex : $listContent}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            status={section.status}
            title={section.title}
            count={section.count}
            collapsed={collapsed.has(section.status)}
            onToggle={() => toggle(section.status)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="box"
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
// Without this the last row scrolls under the floating tab bar.
const $listContent: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
