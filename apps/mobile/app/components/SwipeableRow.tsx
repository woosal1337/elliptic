import { FC, ReactNode, useCallback, useRef } from "react"
import { Dimensions, Pressable, View, ViewStyle } from "react-native"
import ReanimatedSwipeable, {
  SwipeableMethods,
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable"
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"

import { AppIcon, type IconName } from "@/components/AppIcon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticImpact, hapticSelection } from "@/utils/haptics"

export interface SwipeAction {
  key: string
  label: string
  icon: IconName
  /** Background color of the action panel. */
  background: string
  /** Icon/label color. Defaults to the palette's on-error step, which inverts
   *  with the theme — dark in dark mode, light in light mode — so it stays
   *  readable on every action background here. It is not white. */
  foreground?: string
  onPress: () => void
}

const ACTION_W = 76

/**
 * Drag distance at which the first action arms and will fire on release.
 *
 * A fraction of the screen rather than a multiple of the panel width: the panel
 * is 76pt, and a threshold derived from it would land close enough to the
 * resting open position that an ordinary "open the actions" swipe would trip it
 * by accident.
 *
 * This is measured against the row's translation, not the finger's. friction=2
 * moves the row half as far as the thumb, so 0.45 of the screen needed roughly
 * a full screen width of travel to reach — past the reach of one gesture, which
 * is why the panel parked open and waited for a tap instead of firing. At 0.22
 * the thumb travels a little under half the screen, which is a decisive swipe
 * without being an impossible one, and still comfortably clear of the 76pt
 * resting position that an ordinary open lands on.
 */
const FULL_SWIPE_RATIO = 0.3

/**
 * A row with configurable swipe actions (left and/or right), built on
 * gesture-handler's ReanimatedSwipeable.
 *
 * Two ways to invoke an action:
 *  - swipe partway, then tap the revealed button;
 *  - swipe past {@link FULL_SWIPE_RATIO} of the screen and let go — the first
 *    action for that side fires on release, no tap needed. Works on both sides.
 *
 * Arming is computed in a worklet from the swipeable's own translation, so the
 * width animation and the threshold test both run on the UI thread and stay in
 * step with the finger. The only hop to JS is the haptic when the threshold is
 * crossed, which is fired once per crossing rather than per frame.
 */
export const SwipeableRow: FC<{
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
}> = ({ children, leftActions, rightActions }) => {
  const ref = useRef<SwipeableMethods>(null)
  const armedLeft = useSharedValue(false)
  const armedRight = useSharedValue(false)

  const close = useCallback(() => ref.current?.close(), [])

  // Fires when the panel starts animating open — i.e. on release past the open
  // threshold. If the drag also passed the (larger) arm threshold, take the
  // action instead of leaving a panel sitting there waiting for a tap.
  //
  // `direction` is the direction the row MOVED, not the panel that opened: the
  // library reports `toValue > 0 ? RIGHT : LEFT`, and a positive translation
  // means the row slid right, which is what uncovers the LEFT actions. Reading
  // it the other way fires the opposite action.
  const onWillOpen = useCallback(
    (direction: SwipeDirection) => {
      const leftPanel = direction === SwipeDirection.RIGHT
      const armed = leftPanel ? armedLeft : armedRight
      const primary = (leftPanel ? leftActions : rightActions)?.[0]
      if (armed.value && primary) {
        armed.value = false
        primary.onPress()
        close()
        return
      }
      hapticImpact()
    },
    [armedLeft, armedRight, leftActions, rightActions, close],
  )

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      // Overshoot is what a full swipe travels through. At 8, movement past the
      // open position was divided by eight, so arming needed ~244pt of extra
      // thumb travel and never happened however low the threshold went — the
      // panel just parked. 1 lets the row keep following the thumb once open.
      overshootFriction={1}
      rightThreshold={40}
      leftThreshold={40}
      onSwipeableWillOpen={onWillOpen}
      renderLeftActions={
        leftActions?.length
          ? (_progress, translation) => (
              <ActionsPanel
                actions={leftActions}
                side="left"
                translation={translation}
                armed={armedLeft}
                onDone={close}
              />
            )
          : undefined
      }
      renderRightActions={
        rightActions?.length
          ? (_progress, translation) => (
              <ActionsPanel
                actions={rightActions}
                side="right"
                translation={translation}
                armed={armedRight}
                onDone={close}
              />
            )
          : undefined
      }
    >
      {children}
    </ReanimatedSwipeable>
  )
}

/**
 * The revealed action strip for one side.
 *
 * When the drag arms, the first action grows to fill the whole exposed width and
 * the rest collapse away, so the row reads as "let go and this happens" rather
 * than "pick one of these".
 */
const ActionsPanel: FC<{
  actions: SwipeAction[]
  side: "left" | "right"
  translation: SharedValue<number>
  armed: SharedValue<boolean>
  onDone: () => void
}> = ({ actions, side, translation, armed, onDone }) => {
  const threshold = Dimensions.get("window").width * FULL_SWIPE_RATIO

  // One worklet watching translation. Writes `armed` for the release handler and
  // ticks a haptic on each crossing — both directions, so backing out below the
  // threshold is as legible as arming was.
  useAnimatedReaction(
    () => (side === "left" ? translation.value : -translation.value),
    (distance, previous) => {
      const isArmed = distance >= threshold
      if (previous !== null && isArmed !== armed.value) {
        armed.value = isArmed
        runOnJS(isArmed ? hapticImpact : hapticSelection)()
      }
    },
    [threshold, side],
  )

  const primaryStyle = useAnimatedStyle(() => {
    const distance = side === "left" ? translation.value : -translation.value
    // Grow only past the threshold; below it the strip keeps its resting layout
    // so a normal open still looks like a row of buttons.
    return { width: distance >= threshold ? Math.max(distance, ACTION_W) : ACTION_W }
  })

  const secondaryStyle = useAnimatedStyle(() => {
    const distance = side === "left" ? translation.value : -translation.value
    return distance >= threshold ? { width: 0, opacity: 0 } : { width: ACTION_W, opacity: 1 }
  })

  const [primary, ...rest] = actions
  return (
    <View style={$actions}>
      <ActionButton action={primary} onDone={onDone} style={primaryStyle} />
      {rest.map((a) => (
        <ActionButton key={a.key} action={a} onDone={onDone} style={secondaryStyle} />
      ))}
    </View>
  )
}

const ActionButton: FC<{
  action: SwipeAction
  onDone: () => void
  style?: ReturnType<typeof useAnimatedStyle>
}> = ({ action, onDone, style }) => {
  const {
    theme: { colors },
  } = useAppTheme()
  const fg = action.foreground ?? colors.onError
  return (
    <Animated.View style={[$action, { backgroundColor: action.background }, style]}>
      <Pressable
        testID={`swipe-action-${action.key}`}
        onPress={() => {
          action.onPress()
          onDone()
        }}
        style={$hit}
      >
        <AppIcon name={action.icon} size={20} color={fg} />
        <Text text={action.label} size="xxs" weight="medium" style={{ color: fg }} />
      </Pressable>
    </Animated.View>
  )
}

const $actions: ViewStyle = { flexDirection: "row" }
const $action: ViewStyle = { overflow: "hidden" }
const $hit: ViewStyle = {
  width: ACTION_W,
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
}
