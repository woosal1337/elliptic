import { FC, useCallback, useMemo, useState } from "react"
import { Pressable, RefreshControl, SectionList, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { AppIcon, type IconName } from "@/components/AppIcon"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { ScreenHeader } from "@/components/ScreenHeader"
import { SectionHeader } from "@/components/SectionHeader"
import { SegmentedControl } from "@/components/SegmentedControl"
import { ListSkeleton } from "@/components/Skeleton"
import { SwipeableRow } from "@/components/SwipeableRow"
import { Text } from "@/components/Text"
import { useToast } from "@/components/Toast"
import { useOrg } from "@/context/OrgContext"
import type { InboxStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import type { NotificationItem } from "@/services/api/types"
import { invalidate, queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { hapticSuccess } from "@/utils/haptics"
import { openEntity } from "@/utils/openEntity"
import { relativeTime } from "@/utils/relativeTime"
import { useListQuery } from "@/utils/useListQuery"

type Filter = "all" | "unread"
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
]

/** Icon for the entity a notification points at (Linear-style, not the actor). */
const ENTITY_ICONS: Record<string, IconName> = {
  task: "square-check",
  note: "file-text",
  project: "folder-open",
  meeting: "calendar",
  sticky: "sticky-note",
}

/** Map a notification type to a short human reason line. */
function reasonFor(n: NotificationItem): string {
  const who = n.actor_name || "Someone"
  switch (n.type) {
    case "assigned":
      return `${who} assigned you`
    case "mentioned":
      return `${who} mentioned you`
    case "commented":
      return `${who} commented`
    case "member_added":
      return `${who} added you`
    case "meeting_action_done":
      return `${who} · meeting action`
    case "urgent":
      return `${who} marked urgent`
    default:
      return who
  }
}

/** Bucket label for day grouping. */
function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "Earlier"
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000)
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export const NotificationsScreen: FC<InboxStackScreenProps<"Notifications">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, radius },
  } = useAppTheme()
  const [filter, setFilter] = useState<Filter>("all")
  const cacheKey = activeOrg ? queryKeys.notifications(activeOrg.id, filter) : null
  const fetcher = useCallback(
    () =>
      activeOrg
        ? api.listNotifications(activeOrg.id, filter === "unread")
        : Promise.resolve<NotificationItem[]>([]),
    [activeOrg, filter],
  )
  const { data, loading, refreshing, refresh } = useListQuery<NotificationItem>(cacheKey, fetcher)
  const toast = useToast()

  const sections = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>()
    for (const n of data) {
      const label = dayLabel(n.created_at)
      const arr = groups.get(label) ?? []
      arr.push(n)
      groups.set(label, arr)
    }
    return [...groups.entries()].map(([title, items]) => ({ title, data: items }))
  }, [data])

  const refetchInbox = () => {
    if (activeOrg) invalidate(activeOrg.id, "notifications")
  }

  const open = (n: NotificationItem) => {
    if (!activeOrg) return
    if (!n.read_at) void api.markNotificationRead(activeOrg.id, n.id).then(refetchInbox)
    if (n.entity_id) {
      const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
      openEntity(parent, n.entity_type, n.entity_id, n.title)
    }
  }

  const markRead = (n: NotificationItem) => {
    if (!activeOrg) return
    hapticSuccess()
    void api.markNotificationRead(activeOrg.id, n.id).then(refetchInbox)
  }

  // Snooze and archive are one-way on the server (no unsnooze/unarchive
  // endpoint), so the toast confirms rather than offering an undo.
  const snooze = (n: NotificationItem) => {
    if (!activeOrg) return
    const until = new Date()
    until.setDate(until.getDate() + 1)
    until.setHours(9, 0, 0, 0) // resurface tomorrow morning
    void api.snoozeNotification(activeOrg.id, n.id, until.toISOString()).then((ok) => {
      refetchInbox()
      if (ok) toast("Snoozed until tomorrow", { variant: "success" })
      else toast("Couldn't snooze that", { variant: "error" })
    })
  }

  const archive = (n: NotificationItem) => {
    if (!activeOrg) return
    void api.archiveNotification(activeOrg.id, n.id).then((ok) => {
      refetchInbox()
      if (ok) toast("Archived", { variant: "success" })
      else toast("Couldn't archive that", { variant: "error" })
    })
  }

  const markAll = () => {
    if (activeOrg) void api.markAllNotificationsRead(activeOrg.id).then(refetchInbox)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={["top"]}>
      <ScreenHeader
        title="Inbox"
        actions={[
          {
            key: "read-all",
            icon: "check-check",
            label: "Mark all read",
            onPress: markAll,
          },
          {
            key: "triage",
            icon: "inbox",
            label: "Triage",
            emphasis: true,
            onPress: () => navigation.navigate("Triage"),
          },
        ]}
      >
        <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
      </ScreenHeader>

      {loading ? (
        <ListSkeleton rows={4} height={52} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
          }
          contentContainerStyle={sections.length === 0 ? $grow : $bottomClearance}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} count={section.data.length} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title="You're all caught up"
              caption="New activity will show up here."
            />
          }
          renderItem={({ item }) => {
            const unread = !item.read_at
            return (
              <SwipeableRow
                leftActions={
                  unread
                    ? [
                        {
                          key: "read",
                          label: "Read",
                          icon: "mail-open",
                          background: colors.tint,
                          onPress: () => markRead(item),
                        },
                      ]
                    : []
                }
                rightActions={[
                  {
                    key: "snooze",
                    label: "Snooze",
                    icon: "clock",
                    background: colors.warning,
                    onPress: () => snooze(item),
                  },
                  {
                    key: "archive",
                    label: "Archive",
                    icon: "archive",
                    background: colors.textDim,
                    onPress: () => archive(item),
                  },
                ]}
              >
                <Pressable
                  onPress={() => open(item)}
                  style={({ pressed }) => [
                    $row,
                    {
                      backgroundColor: pressed ? colors.muted : colors.background,
                      borderBottomColor: colors.separator,
                      opacity: unread ? 1 : 0.6,
                    },
                  ]}
                >
                  <View
                    style={[$iconTile, { backgroundColor: colors.muted, borderRadius: radius.md }]}
                  >
                    <AppIcon
                      name={ENTITY_ICONS[item.entity_type] ?? "notifications-outline"}
                      size={18}
                      color={unread ? colors.tint : colors.textDim}
                    />
                  </View>
                  <View style={$grow2}>
                    <View style={$titleRow}>
                      {unread ? <View style={[$dot, { backgroundColor: colors.tint }]} /> : null}
                      <Text
                        text={item.title}
                        size="sm"
                        weight={unread ? "medium" : "normal"}
                        numberOfLines={1}
                        style={$title}
                      />
                    </View>
                    <Text
                      text={`${reasonFor(item)} · ${relativeTime(item.created_at)}`}
                      size="xs"
                      style={{ color: colors.textDim }}
                      numberOfLines={1}
                    />
                  </View>
                </Pressable>
              </SwipeableRow>
            )
          }}
        />
      )}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flexGrow: 1 }
// Let the last row scroll clear of the floating tab bar and any toast.
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
const $grow2: ViewStyle = { flex: 1, gap: 3 }
const $titleRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 7 }
const $title: ViewStyle = { flex: 1 }
const $dot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }
const $iconTile: ViewStyle = {
  width: 36,
  height: 36,
  alignItems: "center",
  justifyContent: "center",
}
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderBottomWidth: 1,
}
