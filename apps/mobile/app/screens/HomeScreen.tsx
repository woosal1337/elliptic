import { FC, useCallback, useEffect, useState } from "react"
import { Pressable, RefreshControl, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { OrgSwitcher } from "@/components/OrgSwitcher"
import { Screen } from "@/components/Screen"
import { TaskListSkeleton } from "@/components/Skeleton"
import { TaskRow } from "@/components/TaskRow"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import { TAB_BAR_CLEARANCE } from "@/navigators/FloatingTabBar"
import type { HomeStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Task } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { openEntity } from "@/utils/openEntity"
import { useListQuery } from "@/utils/useListQuery"
import { useOfflineQueue } from "@/utils/useOfflineQueue"
import { useUnreadCount } from "@/utils/useUnreadCount"

const QuickLink: FC<{
  icon: keyof typeof Ionicons.glyphMap
  label: string
  badge?: number
  onPress: () => void
}> = ({ icon, label, badge, onPress }) => {
  const {
    theme: { colors, radius },
  } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        $quick,
        { borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.tint} />
      <Text text={label} size="xs" weight="medium" />
      {badge && badge > 0 ? (
        <View style={[$badge, { backgroundColor: colors.tint }]}>
          <Text text={String(badge)} size="xxs" style={{ color: colors.onTint }} />
        </View>
      ) : null}
    </Pressable>
  )
}

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
  const unread = useUnreadCount(activeOrg?.id)
  const pending = useOfflineQueue()
  const [triage, setTriage] = useState(0)
  useEffect(() => {
    if (activeOrg) void api.triageCount(activeOrg.id).then(setTriage)
  }, [activeOrg, tasks])

  const parent = () => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
  const openTask = (t: Task) => openEntity(parent(), "task", t.id, t.identifier)

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE }}
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
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
          <Ionicons name="cloud-offline-outline" size={14} color={colors.textDim} />
          <Text
            text={`${pending} change${pending > 1 ? "s" : ""} waiting to sync`}
            size="xs"
            style={{ color: colors.textDim }}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate("Search")}
        style={[
          $search,
          {
            borderColor: colors.inputBorder,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            marginTop: spacing.md,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textDim} />
        <Text text="Search tasks, notes, projects…" style={{ color: colors.textDim }} />
      </Pressable>

      <View style={[$quickRow, { marginTop: spacing.md }]}>
        <QuickLink
          icon="folder-outline"
          label="Projects"
          onPress={() => navigation.navigate("Projects")}
        />
        <QuickLink
          icon="sparkles-outline"
          label="Assistant"
          onPress={() => navigation.navigate("Chat")}
        />
        <QuickLink
          icon="file-tray-outline"
          label="Triage"
          badge={triage}
          onPress={() => parent()?.navigate("Inbox", { screen: "Triage" })}
        />
        <QuickLink
          icon="notifications-outline"
          label="Inbox"
          badge={unread}
          onPress={() => parent()?.navigate("Inbox", { screen: "Notifications" })}
        />
      </View>

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
    </Screen>
  )
}

const $search: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 12,
}
const $quickRow: ViewStyle = { flexDirection: "row", gap: 8 }
const $quick: ViewStyle = {
  flex: 1,
  alignItems: "center",
  gap: 4,
  borderWidth: 1,
  paddingVertical: 12,
}
const $badge: ViewStyle = {
  position: "absolute",
  top: 6,
  right: 10,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 4,
}
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
