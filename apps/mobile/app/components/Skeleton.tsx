import { FC, useEffect, useRef } from "react"
import { Animated, DimensionValue, ViewStyle } from "react-native"

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
