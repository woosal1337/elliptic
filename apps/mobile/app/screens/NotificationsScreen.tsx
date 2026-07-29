import { FC, useCallback, useState } from "react"
import { FlatList, Pressable, RefreshControl, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { Avatar } from "@/components/Avatar"
import { Screen } from "@/components/Screen"
import { SegmentedControl } from "@/components/SegmentedControl"
import { Skeleton } from "@/components/Skeleton"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import type { InboxStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { NotificationItem } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { openEntity } from "@/utils/openEntity"
import { useCachedList } from "@/utils/useCachedList"

type Filter = "all" | "unread"
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
]

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

/** Compact relative time (e.g. "2h", "3d", "Jun 11"). */
function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export const NotificationsScreen: FC<InboxStackScreenProps<"Notifications">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [filter, setFilter] = useState<Filter>("all")
  const cacheKey = activeOrg ? `notifs:${activeOrg.id}:${filter}` : null
  const fetcher = useCallback(
    () =>
      activeOrg
        ? api.listNotifications(activeOrg.id, filter === "unread")
        : Promise.resolve<NotificationItem[]>([]),
    [activeOrg, filter],
  )
  const { data, loading, refreshing, refresh } = useCachedList<NotificationItem>(cacheKey, fetcher)

  const open = (n: NotificationItem) => {
    if (!activeOrg) return
    if (!n.read_at) void api.markNotificationRead(activeOrg.id, n.id).then(refresh)
    if (n.entity_id) {
      const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
      openEntity(parent, n.entity_type, n.entity_id, n.title)
    }
  }

  const markAll = () => {
    if (activeOrg) void api.markAllNotificationsRead(activeOrg.id).then(refresh)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$flex} safeAreaEdges={["top"]}>
      <View style={[$header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        <Text preset="heading" text="Inbox" />
        <View style={$headerActions}>
          <Pressable onPress={markAll} hitSlop={8}>
            <Text text="Mark all read" size="xs" style={{ color: colors.textDim }} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Triage")} hitSlop={8}>
            <Text text="Triage" size="xs" weight="semiBold" style={{ color: colors.tint }} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xs }}>
        <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
          }
          ListEmptyComponent={
            <View style={$empty}>
              <Text
                preset="subheading"
                text="You're all caught up"
                style={{ color: colors.text, marginBottom: 4 }}
              />
              <Text text="New activity will show up here." style={{ color: colors.textDim }} />
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.read_at
            return (
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
                <Avatar name={item.actor_name || "?"} size={36} />
                <View style={$grow}>
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
                    text={`${reasonFor(item)} · ${relTime(item.created_at)}`}
                    size="xs"
                    style={{ color: colors.textDim }}
                    numberOfLines={1}
                  />
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}
const $headerActions: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 16 }
const $empty: ViewStyle = { paddingTop: 80, paddingHorizontal: 48, alignItems: "center" }
const $grow: ViewStyle = { flex: 1, gap: 3 }
const $titleRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 7 }
const $title: ViewStyle = { flex: 1 }
const $dot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }
const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderBottomWidth: 1,
}
