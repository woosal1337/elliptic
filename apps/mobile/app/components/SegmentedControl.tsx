import { ViewStyle } from "react-native"
import NativeSegmentedControl from "@react-native-segmented-control/segmented-control"

import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { hapticSelection } from "@/utils/haptics"

export interface Segment<T extends string> {
  key: T
  label: string
}

/**
 * UIKit's own segmented control, so the selection slides with the system
 * animation (and takes the Liquid Glass treatment on iOS 26) instead of a
 * hand-rolled spring. The API stays keyed, so call sites work in their own union.
 */
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
    theme: { colors },
    themeContext,
  } = useAppTheme()
  const index = Math.max(
    0,
    segments.findIndex((s) => s.key === value),
  )

  return (
    <NativeSegmentedControl
      values={segments.map((s) => s.label)}
      selectedIndex={index}
      appearance={themeContext === "dark" ? "dark" : "light"}
      fontStyle={{ color: colors.textDim, fontFamily: typography.primary.medium }}
      activeFontStyle={{ color: colors.text, fontFamily: typography.primary.semiBold }}
      style={$control}
      onChange={(event) => {
        const next = segments[event.nativeEvent.selectedSegmentIndex]
        if (!next || next.key === value) return
        hapticSelection()
        onChange(next.key)
      }}
    />
  )
}

const $control: ViewStyle = { height: 34 }
