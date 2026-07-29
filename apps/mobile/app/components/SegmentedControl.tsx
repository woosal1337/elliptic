import { Pressable, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"

export interface Segment<T extends string> {
  key: T
  label: string
}

/** A compact pill segmented control (tokenized). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[]
  value: T
  onChange: (key: T) => void
}) {
  const {
    theme: { colors, radius },
  } = useAppTheme()

  return (
    <View style={[$track, { backgroundColor: colors.muted, borderRadius: radius.md, padding: 3 }]}>
      {segments.map((s) => {
        const active = s.key === value
        return (
          <Pressable
            key={s.key}
            onPress={() => {
              if (!active) {
                hapticSelection()
                onChange(s.key)
              }
            }}
            style={[
              $seg,
              {
                borderRadius: radius.sm,
                backgroundColor: active ? colors.surface : "transparent",
              },
            ]}
          >
            <Text
              text={s.label}
              size="xs"
              weight={active ? "semiBold" : "medium"}
              style={{ color: active ? colors.text : colors.textDim }}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

const $track: ViewStyle = { flexDirection: "row", alignSelf: "flex-start" }
const $seg: ViewStyle = { paddingVertical: 6, paddingHorizontal: 16, alignItems: "center" }
