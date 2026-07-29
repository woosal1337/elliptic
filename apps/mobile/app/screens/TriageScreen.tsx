import { FC, useCallback, useState } from "react"
import { FlatList, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Sheet } from "@/components/Sheet"
import { Skeleton } from "@/components/Skeleton"
import { SwipeableRow } from "@/components/SwipeableRow"
import { TaskRow } from "@/components/TaskRow"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useOrg } from "@/context/OrgContext"
import type { InboxStackScreenProps, MainTabParamList } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { Task } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { hapticSuccess } from "@/utils/haptics"
import { openEntity } from "@/utils/openEntity"
import { useCachedList } from "@/utils/useCachedList"

export const TriageScreen: FC<InboxStackScreenProps<"Triage">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const cacheKey = activeOrg ? `triage:${activeOrg.id}` : null
  const fetcher = useCallback(
    () => (activeOrg ? api.listTriage(activeOrg.id) : Promise.resolve<Task[]>([])),
    [activeOrg],
  )
  const { data: items, loading, refreshing, refresh } = useCachedList<Task>(cacheKey, fetcher)
  const [declineFor, setDeclineFor] = useState<Task | null>(null)
  const [reason, setReason] = useState("")

  const accept = (t: Task) => {
    if (activeOrg) {
      hapticSuccess()
      void api.acceptTriage(activeOrg.id, t.id).then(refresh)
    }
  }
  const snooze = (t: Task) => {
    if (!activeOrg) return
    const until = new Date()
    until.setDate(until.getDate() + 7)
    void api.snoozeTriage(activeOrg.id, t.id, until.toISOString()).then(refresh)
  }
  const confirmDecline = () => {
    if (!activeOrg || !declineFor) return
    void api
      .declineTriage(activeOrg.id, declineFor.id, reason.trim() || "Declined on mobile")
      .then(() => {
        setDeclineFor(null)
        setReason("")
        refresh()
      })
  }
  const openTask = (t: Task) => {
    const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
    openEntity(parent, "task", t.id, t.identifier)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={[$flex, { paddingTop: spacing.sm }]}>
      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            <View style={$empty}>
              <Text
                preset="subheading"
                text="Nothing to triage"
                style={{ color: colors.text, marginBottom: 4 }}
              />
              <Text
                text="Incoming work will land here for you to accept."
                style={{ color: colors.textDim, textAlign: "center" }}
              />
            </View>
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
const $empty: ViewStyle = { paddingTop: 80, paddingHorizontal: 48, alignItems: "center" }
