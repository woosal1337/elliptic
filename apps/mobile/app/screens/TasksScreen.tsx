import { FC, useCallback, useMemo, useState } from "react"
import { RefreshControl, SectionList, ViewStyle } from "react-native"

import { CreateTaskSheet } from "@/components/CreateTaskSheet"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ScreenHeader } from "@/components/ScreenHeader"
import { SectionHeader } from "@/components/SectionHeader"
import { TaskListSkeleton } from "@/components/Skeleton"
import { SwipeableRow } from "@/components/SwipeableRow"
import { TaskRow } from "@/components/TaskRow"
import { useToast } from "@/components/Toast"
import { useOrg } from "@/context/OrgContext"
import type { TasksStackScreenProps } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { Task } from "@/services/api/types"
import { invalidate, queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { hapticSuccess } from "@/utils/haptics"
import { prettyLabel, STATUS_OPTIONS } from "@/utils/taskOptions"
import { useCollapsedSections } from "@/utils/useCollapsedSections"
import { useListQuery } from "@/utils/useListQuery"

// Every status the API can return must appear in one of these two lists:
// sections are built by filtering them, so a status in neither has no section
// and its tasks are silently invisible rather than merely tucked away.
const ACTIVE_STATUSES = ["in_progress", "in_review", "todo", "backlog"]

/**
 * Closed work, kept below the active statuses. These sit shut and show only a
 * header and a count — enough to see that eleven things got finished without
 * scrolling past them to reach the work that has not.
 *
 * A section appears only when something is in it, so a board with nothing
 * cancelled never grows a Cancelled header.
 */
const CLOSED_STATUSES = ["done", "cancelled", "duplicate"]

const STATUS_ORDER = [...ACTIVE_STATUSES, ...CLOSED_STATUSES]

/**
 * Folded shut on every visit. Backlog and in-progress carry the long tail, and
 * closed work is history — opening Tasks to a wall of either buries the middle
 * of the board. Expanding one holds while you are on the screen, then resets.
 */
const COLLAPSED_ON_MOUNT = ["backlog", "in_progress", ...CLOSED_STATUSES]

export const TasksScreen: FC<TasksStackScreenProps<"TasksList">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors },
  } = useAppTheme()
  const [showCreate, setShowCreate] = useState(false)
  const { collapsed, toggle } = useCollapsedSections("tasks", COLLAPSED_ON_MOUNT)
  const cacheKey = activeOrg ? queryKeys.tasks(activeOrg.id, "all") : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listTasks(activeOrg.id, "all") : Promise.resolve<Task[]>([])),
    [activeOrg],
  )
  const { data: tasks, loading, refreshing, refresh } = useListQuery<Task>(cacheKey, fetcher)
  const toast = useToast()

  const transition = (t: Task, status: string) => {
    if (!activeOrg) return
    const orgId = activeOrg.id
    const previous = t.status
    hapticSuccess()
    void api.transitionTaskStatus(orgId, t.id, status).then((updated) => {
      invalidate(orgId, "tasks")
      if (!updated) {
        toast("Couldn't update that task", { variant: "error" })
        return
      }
      toast(`${t.identifier} → ${prettyLabel(status, STATUS_OPTIONS)}`, {
        variant: "success",
        action: {
          label: "Undo",
          onPress: () => {
            void api
              .transitionTaskStatus(orgId, t.id, previous)
              .then(() => invalidate(orgId, "tasks"))
          },
        },
      })
    })
  }

  const sections = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const t of tasks) {
      const arr = groups.get(t.status) ?? []
      arr.push(t)
      groups.set(t.status, arr)
    }
    return STATUS_ORDER.filter((s) => groups.has(s)).map((status) => {
      const rows = groups.get(status)!
      return {
        status,
        title: prettyLabel(status, STATUS_OPTIONS),
        count: rows.length,
        data: collapsed.has(status) ? [] : rows,
      }
    })
  }, [tasks, collapsed])

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={["top"]}>
      <ScreenHeader
        title="Tasks"
        actions={
          activeOrg
            ? [
                {
                  key: "create",
                  icon: "plus",
                  label: "New task",
                  emphasis: true,
                  onPress: () => setShowCreate(true),
                },
              ]
            : []
        }
      />

      {loading ? (
        <TaskListSkeleton />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.textDim}
              colors={[colors.textDim]}
            />
          }
          contentContainerStyle={sections.length === 0 ? $grow : $bottomClearance}
          ListEmptyComponent={
            <EmptyState
              icon="check-check"
              title="No tasks here"
              caption="Create one with the + button."
            />
          }
          renderSectionHeader={({ section }) => (
            <SectionHeader
              status={section.status}
              title={section.title}
              count={section.count}
              collapsed={collapsed.has(section.status)}
              onToggle={() => toggle(section.status)}
            />
          )}
          renderItem={({ item }) => (
            <SwipeableRow
              leftActions={
                item.status === "done"
                  ? []
                  : [
                      {
                        key: "done",
                        label: "Done",
                        icon: "check",
                        background: colors.statusDone,
                        onPress: () => transition(item, "done"),
                      },
                    ]
              }
              rightActions={
                item.status === "in_progress"
                  ? []
                  : [
                      {
                        key: "start",
                        label: "Start",
                        icon: "play",
                        background: colors.statusInProgress,
                        onPress: () => transition(item, "in_progress"),
                      },
                    ]
              }
            >
              <TaskRow
                task={item}
                onPress={() =>
                  navigation.navigate("TaskDetail", { taskId: item.id, title: item.identifier })
                }
              />
            </SwipeableRow>
          )}
        />
      )}

      {activeOrg ? (
        <CreateTaskSheet
          orgId={activeOrg.id}
          visible={showCreate}
          onClose={() => setShowCreate(false)}
        />
      ) : null}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flexGrow: 1 }
// Let the last row scroll clear of the floating tab bar and any toast.
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
