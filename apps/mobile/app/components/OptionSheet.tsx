import { FC } from "react"
import { Pressable, ScrollView, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface Option {
  label: string
  value: string
}

/** A bottom sheet of single-select options with a check on the active one. */
export const OptionSheet: FC<{
  visible: boolean
  onClose: () => void
  title?: string
  options: Option[]
  selected?: string | null
  onSelect: (value: string) => void
}> = ({ visible, onClose, title, options, selected, onSelect }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={$list}>
        {options.map((opt) => {
          const active = opt.value === selected
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value)
                onClose()
              }}
              style={[$row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
            >
              <View style={$grow}>
                <Text
                  text={opt.label}
                  weight={active ? "medium" : undefined}
                  style={{ color: active ? colors.tint : colors.text }}
                />
              </View>
              {active ? <AppIcon name="check" size={20} color={colors.tint} /> : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </Sheet>
  )
}

const $list: ViewStyle = { maxHeight: 380 }
const $row: ViewStyle = { flexDirection: "row", alignItems: "center" }
const $grow: ViewStyle = { flex: 1 }
