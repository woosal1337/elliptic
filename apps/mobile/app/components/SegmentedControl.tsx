import { useState } from "react"
import { LayoutChangeEvent, Pressable, View, ViewStyle } from "react-native"
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"

export interface Segment<T extends string> {
  key: T
  label: string
}

const PADDING = 3
const SPRING = { damping: 20, stiffness: 260, mass: 0.6 }

/** A compact pill segmented control whose thumb springs to the active segment. */
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
  // Measured from the track so the thumb matches whatever the labels need.
  const [trackWidth, setTrackWidth] = useState(0)
  const index = Math.max(
    0,
    segments.findIndex((s) => s.key === value),
  )
  const segWidth = trackWidth ? (trackWidth - PADDING * 2) / segments.length : 0

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)

  const $thumb = useAnimatedStyle(
    () => ({
      width: segWidth,
      transform: [{ translateX: withSpring(index * segWidth, SPRING) }],
    }),
    [segWidth, index],
  )

  return (
    <View
      onLayout={onLayout}
      style={[$track, { backgroundColor: colors.muted, borderRadius: radius.md }]}
    >
      {segWidth > 0 ? (
        <Animated.View
          style={[$thumbBase, { backgroundColor: colors.surface, borderRadius: radius.sm }, $thumb]}
        />
      ) : null}
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
            style={$seg}
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

const $track: ViewStyle = {
  flexDirection: "row",
  alignSelf: "flex-start",
  padding: PADDING,
}
const $seg: ViewStyle = {
  paddingVertical: 6,
  paddingHorizontal: 16,
  alignItems: "center",
  flex: 1,
}
const $thumbBase: ViewStyle = {
  position: "absolute",
  top: PADDING,
  left: PADDING,
  bottom: PADDING,
}
