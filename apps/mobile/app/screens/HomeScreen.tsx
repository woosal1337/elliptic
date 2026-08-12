import { FC, useCallback } from "react"
import { Pressable, RefreshControl, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { AppIcon } from "@/components/AppIcon"
import { GlassSurface, LIQUID_GLASS } from "@/components/Glass"
import { OrgSwitcher } from "@/components/OrgSwitcher"
import { ProjectRow } from "@/components/ProjectRow"
import { Screen } from "@/components/Screen"
import { TaskListSkeleton } from "@/components/Skeleton"
import { TaskRow } from "@/components/TaskRow"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { Project, Task } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { useWidgetSnapshot } from "@/services/widget/useWidgetSnapshot"
import { useAppTheme } from "@/theme/context"
import { openEntity } from "@/utils/openEntity"
import { useListQuery } from "@/utils/useListQuery"
import { useOfflineQueue } from "@/utils/useOfflineQueue"

export const HomeScreen: FC<HomeStackScreenProps<"HomeMain">> = ({ navigation }) => {
  const { user } = useAuth()
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const fetcher = useCallback(
    () => (activeOrg ? api.listTasks(activeOrg.id, "assigned") : Promise.resolve<Task[]>([])),
    [activeOrg],
  )
  const {
    data: tasks,
    loading,
    refreshing,
    refresh,
  } = useListQuery<Task>(activeOrg ? queryKeys.tasks(activeOrg.id, "assigned") : null, fetcher)
  // Home surfaces actionable work only; closed tasks live in the Tasks tab.
  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled")
  const projectFetcher = useCallback(
    () => (activeOrg ? api.listProjects(activeOrg.id) : Promise.resolve<Project[]>([])),
    [activeOrg],
  )
  const { data: projects } = useListQuery<Project>(
    activeOrg ? queryKeys.projects(activeOrg.id) : null,
    projectFetcher,
  )
  // Home already holds everything the widget needs for the active workspace —
  // the org, its projects and its tasks — so it publishes rather than adding a
  // second set of fetches somewhere else.
  useWidgetSnapshot(activeOrg, projects, tasks)

  const pending = useOfflineQueue()
  const parent = () => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
  const openTask = (t: Task) => openEntity(parent(), "task", t.id, t.identifier)

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE }}
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.textDim}
            colors={[colors.textDim]}
          />
        ),
      }}
    >
      <OrgSwitcher />
      <Text
        preset="heading"
        text={`Hi, ${user?.full_name?.split(" ")[0] ?? "there"}`}
        style={{ marginTop: spacing.lg }}
      />

      {pending > 0 ? (
        <View style={[$pending, { backgroundColor: colors.subtle }]}>
          <AppIcon name="cloud-off" size={14} color={colors.textDim} />
          <Text
            text={`${pending} change${pending > 1 ? "s" : ""} waiting to sync`}
            size="xs"
            style={{ color: colors.textDim }}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate("Search")}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Search tasks, notes, projects"
        style={{ marginTop: spacing.md }}
      >
        <GlassSurface
          interactive
          style={[
            $search,
            { borderRadius: radius.full },
            !LIQUID_GLASS && [$bordered, { borderColor: colors.inputBorder }],
          ]}
        >
          <AppIcon name="search" size={18} color={colors.textDim} />
          <Text text="Search tasks, notes, projects…" style={{ color: colors.textDim }} />
        </GlassSurface>
      </Pressable>

      <Text
        preset="subheading"
        text="Your tasks"
        style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}
      />
      {loading ? (
        <TaskListSkeleton rows={3} padded={false} />
      ) : activeTasks.length === 0 ? (
        <Text
          text="Nothing assigned to you."
          style={{ color: colors.textDim, marginTop: spacing.sm }}
        />
      ) : (
        // Full-bleed the rows so TaskRow's own padding lines up with the screen edge.
        <View style={{ marginHorizontal: -spacing.lg }}>
          {activeTasks.slice(0, 8).map((t) => (
            <TaskRow key={t.id} task={t} onPress={() => openTask(t)} />
          ))}
        </View>
      )}

      {projects.length > 0 ? (
        <>
          <View style={[$sectionHead, { marginTop: spacing.xl, marginBottom: spacing.xs }]}>
            <Text preset="subheading" text="Projects" />
            {projects.length > PROJECT_PREVIEW ? (
              <Pressable
                onPress={() => navigation.navigate("Projects")}
                accessibilityRole="button"
                accessibilityLabel="See all projects"
                hitSlop={8}
              >
                <Text text="See all" size="sm" weight="medium" style={{ color: colors.tint }} />
              </Pressable>
            ) : null}
          </View>
          <View style={{ marginHorizontal: -spacing.lg }}>
            {projects.slice(0, PROJECT_PREVIEW).map((p, i, shown) => (
              <ProjectRow
                key={p.id}
                project={p}
                divider={i < shown.length - 1}
                onPress={() =>
                  navigation.navigate("ProjectDetail", { projectId: p.id, title: p.name })
                }
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  )
}

// Home previews a few projects; the rest live behind "See all".
const PROJECT_PREVIEW = 5
const $sectionHead: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}
const $search: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 12,
}
const $bordered: ViewStyle = { borderWidth: 1 }
const $pending: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  alignSelf: "flex-start",
  marginTop: 10,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
}
