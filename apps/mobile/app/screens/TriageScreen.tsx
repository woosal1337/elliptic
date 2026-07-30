import { FC, useCallback, useState } from "react"
import { FlatList, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Sheet } from "@/components/Sheet"
import { TaskListSkeleton } from "@/components/Skeleton"
import { SwipeableRow } from "@/components/SwipeableRow"
import { TaskRow } from "@/components/TaskRow"
import { TextField } from "@/components/TextField"
import { useToast } from "@/components/Toast"
import { useOrg } from "@/context/OrgContext"
import { TAB_BAR_CLEARANCE } from "@/navigators/FloatingTabBar"
import type { InboxStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Task } from "@/services/api/types"
import { invalidate, queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { openEntity } from "@/utils/openEntity"
import { useListQuery } from "@/utils/useListQuery"

export const TriageScreen: FC<InboxStackScreenProps<"Triage">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const cacheKey = activeOrg ? queryKeys.triage(activeOrg.id) : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listTriage(activeOrg.id) : Promise.resolve<Task[]>([])),
    [activeOrg],
  )
  const { data: items, loading, refreshing, refresh } = useListQuery<Task>(cacheKey, fetcher)
  const toast = useToast()
  const [declineFor, setDeclineFor] = useState<Task | null>(null)
  const [reason, setReason] = useState("")

  const accept = (t: Task) => {
    if (activeOrg) {
      void api.acceptTriage(activeOrg.id, t.id).then((ok) => {
        refresh()
        invalidate(activeOrg.id, "tasks") // accepted work lands in assigned lists
        if (ok) toast(`${t.identifier} accepted`, { variant: "success" })
        else toast("Couldn't accept that task", { variant: "error" })
      })
    }
  }
  const snooze = (t: Task) => {
    if (!activeOrg) return
    const until = new Date()
    until.setDate(until.getDate() + 7)
    void api.snoozeTriage(activeOrg.id, t.id, until.toISOString()).then((ok) => {
      refresh()
      if (ok) toast("Snoozed for a week", { variant: "success" })
      else toast("Couldn't snooze that task", { variant: "error" })
    })
  }
  const confirmDecline = () => {
    if (!activeOrg || !declineFor) return
    const identifier = declineFor.identifier
    void api
      .declineTriage(activeOrg.id, declineFor.id, reason.trim() || "Declined on mobile")
      .then((ok) => {
        setDeclineFor(null)
        setReason("")
        refresh()
        if (ok) toast(`${identifier} declined`, { variant: "success" })
        else toast("Couldn't decline that task", { variant: "error" })
      })
  }
  const openTask = (t: Task) => {
    const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
    openEntity(parent, "task", t.id, t.identifier)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={[$flex, { paddingTop: spacing.sm }]}>
      {loading ? (
        <TaskListSkeleton rows={3} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={items.length === 0 ? $grow : $bottomClearance}
          ListEmptyComponent={
            <EmptyState
              icon="albums-outline"
              title="Nothing to triage"
              caption="Incoming work will land here for you to accept."
            />
          }
          renderItem={({ item }) => (
            <SwipeableRow
              leftActions={[
                {
                  key: "accept",
                  label: "Accept",
                  icon: "checkmark",
                  background: colors.success,
                  onPress: () => accept(item),
                },
              ]}
              rightActions={[
                {
                  key: "snooze",
                  label: "Snooze",
                  icon: "time-outline",
                  background: colors.warning,
                  onPress: () => snooze(item),
                },
                {
                  key: "decline",
                  label: "Decline",
                  icon: "close",
                  background: colors.error,
                  onPress: () => setDeclineFor(item),
                },
              ]}
            >
              <TaskRow task={item} onPress={() => openTask(item)} />
            </SwipeableRow>
          )}
        />
      )}

      <Sheet visible={!!declineFor} onClose={() => setDeclineFor(null)} title="Decline — reason">
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <TextField
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this being declined? (optional)"
            multiline
          />
          <Button text="Decline task" preset="filled" onPress={confirmDecline} />
        </View>
      </Sheet>
    </Screen>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $bottomClearance: ViewStyle = { paddingBottom: TAB_BAR_CLEARANCE }
const $grow: ViewStyle = { flexGrow: 1 }
