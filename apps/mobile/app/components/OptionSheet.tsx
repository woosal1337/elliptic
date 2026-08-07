import { FC, ReactNode } from "react"
import { Pressable, ScrollView, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticPress } from "@/utils/haptics"

export interface Option {
  label: string
  value: string
}

/**
 * A bottom sheet of single-select options with a check on the active one.
 *
 * `renderLeading` puts a glyph in front of each row. It stays a prop rather
 * than something the sheet derives, because this component backs status,
 * priority, assignee, due date and conversation pickers — only some of which
 * have an icon vocabulary, and none of which the sheet should have to know about.
 */
export const OptionSheet: FC<{
  visible: boolean
  onClose: () => void
  title?: string
  options: Option[]
  selected?: string | null
  onSelect: (value: string) => void
  renderLeading?: (option: Option) => ReactNode
}> = ({ visible, onClose, title, options, selected, onSelect, renderLeading }) => {
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
              onPress={hapticPress(() => {
                onSelect(opt.value)
                onClose()
              })}
              style={[
                $row,
                { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
              ]}
            >
              {renderLeading ? <View style={$leading}>{renderLeading(opt)}</View> : null}
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
// Fixed width so labels line up whether or not a given glyph is square.
const $leading: ViewStyle = { width: 20, alignItems: "center" }
