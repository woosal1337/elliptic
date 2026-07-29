import { FC, useCallback, useMemo, useState } from "react"
import { RefreshControl, SectionList, View, ViewStyle } from "react-native"

import { CreateTaskSheet } from "@/components/CreateTaskSheet"
import { EmptyState } from "@/components/EmptyState"
import { Fab } from "@/components/Fab"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { SegmentedControl } from "@/components/SegmentedControl"
import { Skeleton } from "@/components/Skeleton"
import { TaskRow } from "@/components/TaskRow"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import type { TasksStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Task } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { prettyLabel, STATUS_OPTIONS } from "@/utils/taskOptions"
import { useCachedList } from "@/utils/useCachedList"

type Scope = "assigned" | "created"
const SCOPES: { key: Scope; label: string }[] = [
  { key: "assigned", label: "Assigned" },
  { key: "created", label: "Created" },
]

// Active work first, closed work last.
const STATUS_ORDER = ["in_progress", "in_review", "todo", "backlog", "done", "cancelled"]

export const TasksScreen: FC<TasksStackScreenProps<"TasksList">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [scope, setScope] = useState<Scope>("assigned")
  const [showCreate, setShowCreate] = useState(false)
  const cacheKey = activeOrg ? `tasks:${activeOrg.id}:${scope}` : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listTasks(activeOrg.id, scope) : Promise.resolve<Task[]>([])),
    [activeOrg, scope],
  )
  const { data: tasks, loading, refreshing, refresh } = useCachedList<Task>(cacheKey, fetcher)

  const sections = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const t of tasks) {
      const arr = groups.get(t.status) ?? []
      arr.push(t)
      groups.set(t.status, arr)
    }
    return STATUS_ORDER.filter((s) => groups.has(s)).map((status) => ({
      status,
      title: prettyLabel(status, STATUS_OPTIONS),
      data: groups.get(status)!,
    }))
  }, [tasks])

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[$flex, { paddingTop: spacing.md }]}
      safeAreaEdges={["top"]}
    >
      <Text preset="heading" text="Tasks" style={{ paddingHorizontal: spacing.lg }} />

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xs }}>
        <SegmentedControl segments={SCOPES} value={scope} onChange={setScope} />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
          }
          contentContainerStyle={sections.length === 0 ? $grow : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-outline"
              title="No tasks here"
              caption="Create one with the + button."
            />
          }
          renderSectionHeader={({ section }) => (
            <SectionHeader status={section.status} title={section.title} count={section.data.length} />
          )}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onPress={() =>
                navigation.navigate("TaskDetail", { taskId: item.id, title: item.identifier })
              }
            />
          )}
        />
      )}

      {activeOrg ? (
        <>
          <Fab onPress={() => setShowCreate(true)} />
          <CreateTaskSheet
            orgId={activeOrg.id}
            visible={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={refresh}
          />
        </>
      ) : null}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flexGrow: 1 }
