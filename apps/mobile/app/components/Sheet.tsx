import { FC, ReactNode, useEffect, useState } from "react"
import { Dimensions, Modal, Pressable, StyleSheet, View, ViewStyle } from "react-native"
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticImpact } from "@/utils/haptics"

const SCREEN_H = Dimensions.get("window").height
const CLOSED = SCREEN_H
const DISMISS_THRESHOLD = 120
const SPRING = { damping: 22, stiffness: 240, mass: 0.7 }

/**
 * A gesture-driven bottom sheet: dimmed backdrop, spring slide-up, and
 * drag-to-dismiss. Declarative `visible`/`onClose` API — a drop-in for the
 * previous Modal-based sheet, so every consumer (pickers, create-task,
 * date picker, org switcher) gets native sheet behavior for free.
 */
export const Sheet: FC<{
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}> = ({ visible, onClose, title, children }) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)

  const translateY = useSharedValue(CLOSED)
  const backdrop = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      backdrop.value = withTiming(1, { duration: 200 })
      translateY.value = withSpring(0, SPRING)
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 180 })
      translateY.value = withTiming(CLOSED, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setMounted)(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY)
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        runOnJS(hapticImpact)()
        runOnJS(onClose)()
      } else {
        translateY.value = withSpring(0, SPRING)
      }
    })

  const $sheetAnim = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))
  const $backdropAnim = useAnimatedStyle(() => ({ opacity: backdrop.value }))

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={$root}>
        <Animated.View style={[$backdropFill, { backgroundColor: colors.palette.overlay50 }, $backdropAnim]}>
          <Pressable style={$backdropFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            $sheet,
            {
              backgroundColor: colors.elevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: insets.bottom + spacing.lg,
            },
            $sheetAnim,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={$grabArea}>
              <View style={[$handle, { backgroundColor: colors.borderStrong }]} />
              {title ? (
                <Text
                  preset="subheading"
                  text={title}
                  style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
                />
              ) : null}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const $root: ViewStyle = { flex: 1 }
const $backdropFill: ViewStyle = StyleSheet.absoluteFillObject
const $sheet: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  paddingTop: 8,
  maxHeight: "88%",
}
const $grabArea: ViewStyle = { paddingTop: 4 }
const $handle: ViewStyle = {
  alignSelf: "center",
  width: 40,
  height: 4,
  borderRadius: 2,
  marginBottom: 12,
}
