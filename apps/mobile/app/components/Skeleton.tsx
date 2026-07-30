import { FC, useEffect, useRef } from "react"
import { Animated, DimensionValue, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"

export interface SkeletonProps {
  width?: DimensionValue
  height?: number
  radius?: number
  style?: ViewStyle
}

/** A pulsing placeholder for loading states. */
export const Skeleton: FC<SkeletonProps> = ({ width = "100%", height = 16, radius = 8, style }) => {
  const opacity = useRef(new Animated.Value(0.4)).current
  const {
    theme: { colors },
  } = useAppTheme()

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.palette.neutral300,
          opacity,
        },
        style,
      ]}
    />
  )
}

/**
 * Loading placeholders in the shape of the content they stand in for — so a
 * list doesn't jump when the real rows arrive (B12). `padded` adds the screen
 * gutter; turn it off inside an already-padded container.
 */
export const ListSkeleton: FC<{ rows?: number; height?: number; padded?: boolean }> = ({
  rows = 4,
  height = 44,
  padded = true,
}) => {
  const {
    theme: { spacing },
  } = useAppTheme()
  return (
    <View
      style={[
        { gap: spacing.md },
        padded && { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
      ]}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </View>
  )
}

/** Task-row shaped placeholders: status glyph, title line, meta line. */
export const TaskListSkeleton: FC<{ rows?: number; padded?: boolean }> = ({
  rows = 5,
  padded = true,
}) => {
  const {
    theme: { spacing },
  } = useAppTheme()
  return (
    <View
      style={[
        { gap: spacing.lg },
        padded && { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
      ]}
    >
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={$taskRow}>
          <Skeleton width={18} height={18} radius={9} />
          <View style={$taskLines}>
            <Skeleton width={`${70 - (i % 3) * 12}%`} height={13} />
            <Skeleton width={64} height={10} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Detail-screen placeholder: title, property chips, body. */
export const DetailSkeleton: FC = () => {
  const {
    theme: { spacing },
  } = useAppTheme()
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton width="80%" height={26} />
      <View style={$chips}>
        <Skeleton width={92} height={28} radius={14} />
        <Skeleton width={78} height={28} radius={14} />
        <Skeleton width={110} height={28} radius={14} />
      </View>
      <Skeleton height={13} />
      <Skeleton width="92%" height={13} />
      <Skeleton width="60%" height={13} />
    </View>
  )
}

const $taskRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12 }
const $taskLines: ViewStyle = { flex: 1, gap: 7 }
const $chips: ViewStyle = { flexDirection: "row", gap: 8 }
