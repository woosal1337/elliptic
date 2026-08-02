import { FC, ReactNode, useEffect, useState } from "react"
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View, ViewStyle } from "react-native"
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { GlassSurface, LIQUID_GLASS } from "@/components/Glass"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticImpact } from "@/utils/haptics"

const SCREEN_H = Dimensions.get("window").height
const CLOSED = SCREEN_H
/** Leave the top of the screen showing so the sheet still reads as a sheet. */
const SHEET_MAX = SCREEN_H * 0.88
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
  // The sheet is pinned to the bottom, so a raised keyboard would otherwise sit
  // on top of its lower half — fields there could be neither seen nor tapped.
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation()
  // Measured rather than assumed: the grab area is taller when the sheet has a
  // title, and the scroll area's height is derived from it below.
  const [grabHeight, setGrabHeight] = useState(0)

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

  // Sit the whole sheet on top of the keyboard instead of behind it, and give
  // up the height the keyboard took.
  const $sheetAnim = useAnimatedStyle(() => {
    const keyboard = Math.max(0, -keyboardHeight.value)
    return {
      bottom: keyboard,
      maxHeight: SHEET_MAX - keyboard,
      transform: [{ translateY: translateY.value }],
    }
  })
  // The scroll area needs a real height, not an inherited one. Flex alone does
  // not bound it here: it takes its content height, overflows the sheet's cap,
  // and then has nothing left to scroll — so tall sheets silently lose whatever
  // sits past the fold.
  const $scrollAnim = useAnimatedStyle(() => ({
    maxHeight:
      SHEET_MAX - Math.max(0, -keyboardHeight.value) - grabHeight - insets.bottom - spacing.lg,
  }))
  const $backdropAnim = useAnimatedStyle(() => ({ opacity: backdrop.value }))

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={$root}>
        <Animated.View
          style={[$backdropFill, { backgroundColor: colors.palette.overlay50 }, $backdropAnim]}
        >
          <Pressable style={$backdropFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            $sheet,
            {
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
            !LIQUID_GLASS && { backgroundColor: colors.elevated },
            $sheetAnim,
          ]}
        >
          <GlassSurface
            style={[
              $sheetFill,
              {
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={$grabArea} onLayout={(e) => setGrabHeight(e.nativeEvent.layout.height)}>
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
            <AnimatedScrollView
              style={[$scroll, $scrollAnim]}
              contentContainerStyle={$scrollContent}
              // Rows stay tappable while a field is focused, and dragging the
              // content puts the keyboard away.
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </AnimatedScrollView>
          </GlassSurface>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

const $root: ViewStyle = { flex: 1 }
const $backdropFill: ViewStyle = StyleSheet.absoluteFillObject
// flexShrink matters more than it looks: without it this view takes its full
// content height and overflows the sheet's maxHeight instead of being bounded
// by it. The ScrollView inside then has no height to scroll within, so a tall
// sheet does not scroll — it just loses everything past the cap, which with a
// keyboard up is every field below the fold. RN defaults flexShrink to 0.
const $sheetFill: ViewStyle = { overflow: "hidden", flexShrink: 1 }
const $sheet: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  paddingTop: 8,
}
const $scroll: ViewStyle = { flexShrink: 1 }
const $scrollContent: ViewStyle = { flexGrow: 1 }
const $grabArea: ViewStyle = { paddingTop: 4 }
const $handle: ViewStyle = {
  alignSelf: "center",
  width: 40,
  height: 4,
  borderRadius: 2,
  marginBottom: 12,
}
