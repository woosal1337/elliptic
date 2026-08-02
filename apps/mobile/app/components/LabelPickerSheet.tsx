import { FC, useCallback } from "react"
import { Pressable, ScrollView, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { EmptyState } from "@/components/EmptyState"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { api } from "@/services/api"
import type { TaskLabel } from "@/services/api/types"
import { queryKeys } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"
import { useListQuery } from "@/utils/useListQuery"

/**
 * Multi-select over the org's labels (B4). Stays open while you toggle — the
 * caller commits on close, so one sheet visit is one write.
 */
export const LabelPickerSheet: FC<{
  visible: boolean
  onClose: () => void
  orgId: string | null
  /** Currently selected label ids. */
  value: string[]
  onChange: (labelIds: string[]) => void
}> = ({ visible, onClose, orgId, value, onChange }) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const fetcher = useCallback(
    () => (orgId ? api.listLabels(orgId) : Promise.resolve<TaskLabel[]>([])),
    [orgId],
  )
  const { data: labels } = useListQuery<TaskLabel>(orgId ? queryKeys.labels(orgId) : null, fetcher)

  const toggle = (id: string) => {
    hapticSelection()
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Labels">
      <ScrollView style={$list}>
        {labels.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No labels yet"
            caption="Labels are created in the web app, then apply to any task here."
          />
        ) : (
          labels.map((l) => {
            const active = value.includes(l.id)
            return (
              <Pressable
                key={l.id}
                testID={`label-option-${l.name}`}
                onPress={() => toggle(l.id)}
                style={[$row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
              >
                <View style={[$dot, { backgroundColor: l.color || colors.textDim }]} />
                <View style={$grow}>
                  <Text
                    text={l.name}
                    weight={active ? "medium" : undefined}
                    style={{ color: active ? colors.tint : colors.text }}
                  />
                </View>
                <View
                  style={[
                    $check,
                    {
                      borderColor: active ? colors.tint : colors.border,
                      backgroundColor: active ? colors.tint : colors.transparent,
                      borderRadius: radius.xs,
                    },
                  ]}
                >
                  {active ? <AppIcon name="check" size={14} color={colors.onTint} /> : null}
                </View>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </Sheet>
  )
}

const $list: ViewStyle = { maxHeight: 380 }
const $row: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 10 }
const $grow: ViewStyle = { flex: 1 }
const $dot: ViewStyle = { width: 10, height: 10, borderRadius: 5 }
const $check: ViewStyle = {
  width: 20,
  height: 20,
  borderWidth: 1.5,
  alignItems: "center",
  justifyContent: "center",
}
