import { FC, ReactNode } from "react"
import { useWindowDimensions, View, ViewStyle } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated"

import { AppIcon, type IconName } from "@/components/AppIcon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticImpact, hapticSelection } from "@/utils/haptics"

export interface SwipeAction {
  key: string
  label: string
  icon: IconName
  /** Background color of the action panel while this action is the armed one. */
  background: string
  /** Icon/label color. Defaults to the palette's on-error step, which inverts
   *  with the theme — dark in dark mode, light in light mode — so it stays
   *  readable on every action background here. It is not white. */
  foreground?: string
  onPress: () => void
}

/**
 * Fractions of the screen at which each action arms.
 *
 * A side with two actions gets two tiers: keep dragging past the first and the
 * panel swaps to the second, with a haptic and a colour change to say so. This
 * is what replaces the old "park the panel open and tap a button" affordance —
 * the second action stays reachable without the gesture ever stopping.
 */
const ARM_PRIMARY = 0.24
const ARM_SECONDARY = 0.58

/** Lively but settled — no wobble, and home in about 300ms. */
const SPRING = { damping: 20, stiffness: 260, mass: 0.6 } as const

/**
 * How far the glyph and its label grow as the row is dragged.
 *
 * Scale is a pure function of drag distance, not an animation: it tracks the
 * thumb the whole way and holds wherever the thumb stops. An earlier version
 * kicked a spring on each arming instead, which grew the icon and then shrank
 * it back while the finger was still moving — the growth read as a twitch
 * rather than as a response.
 *
 * The container is scaled, so the icon and the label grow together.
 *
 * MAX is bounded by the row, not by taste: content is roughly 37pt tall at 1,
 * and the shortest row this sits behind is about 60pt, so 1.45 leaves a margin
 * and nothing can overflow the row's edges.
 */
const SCALE_MIN = 0.8
const SCALE_MAX = 1.45

/** Movement toward a side with no actions. Enough to acknowledge, not to mislead. */
const DEAD_SIDE_RESISTANCE = 0.06

/**
 * A row with configurable swipe actions (left and/or right).
 *
 * The row follows the thumb one-to-one and has **no resting open position**. Let
 * go under the threshold and it springs back; let go past it and the armed
 * action fires. There is nothing to park on and nothing to tap afterwards.
 *
 * This replaced gesture-handler's `ReanimatedSwipeable`, whose whole model is
 * the detent this is trying not to have. Its `friction` also moves the row at a
 * fraction of the thumb's speed, which reads as lag however the numbers are
 * tuned, and its overshoot handling made a long swipe feel like a second,
 * separate gesture rather than a continuation of the first.
 *
 * Everything except the haptics and the action itself runs on the UI thread, so
 * the panel, the row and the finger cannot drift apart.
 */
export const SwipeableRow: FC<{
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
}> = ({ children, leftActions, rightActions }) => {
  const { width } = useWindowDimensions()
  const x = useSharedValue(0)
  // -1 none, 0 primary, 1 secondary. Drives the haptics only; every style
  // derives the same thing from `x` directly so nothing can lag the finger.
  const armed = useSharedValue(-1)

  const primaryPx = width * ARM_PRIMARY
  const secondaryPx = width * ARM_SECONDARY
  const leftCount = leftActions?.length ?? 0
  const rightCount = rightActions?.length ?? 0

  // A positive translation slides the row right, which uncovers the LEFT
  // actions. Getting this backwards fires the opposite action, which is a bug
  // the previous implementation shipped once.
  const indexFor = (offset: number) => {
    "worklet"
    const distance = Math.abs(offset)
    const count = offset > 0 ? leftCount : rightCount
    if (count > 1 && distance >= secondaryPx) return 1
    if (count > 0 && distance >= primaryPx) return 0
    return -1
  }

  const tick = (index: number) => (index >= 0 ? hapticImpact() : hapticSelection())

  const fire = (offset: number, index: number) => {
    const action = (offset > 0 ? leftActions : rightActions)?.[index]
    action?.onPress()
  }

  useAnimatedReaction(
    () => indexFor(x.value),
    (index, previous) => {
      if (previous === null || index === previous) return
      armed.value = index
      runOnJS(tick)(index)
    },
  )

  const pan = Gesture.Pan()
    // Horizontal intent only: without these the row steals the list's vertical
    // scroll and every flick down drags a task sideways.
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const dead =
        (e.translationX > 0 && leftCount === 0) || (e.translationX < 0 && rightCount === 0)
      x.value = dead ? e.translationX * DEAD_SIDE_RESISTANCE : e.translationX
    })
    .onEnd(() => {
      const index = indexFor(x.value)
      if (index >= 0) runOnJS(fire)(x.value, index)
    })
    // Always returns home, including when the gesture is cancelled rather than
    // ended — a row left off-centre by an interrupted swipe cannot be recovered
    // by the user, since there is no open state to close.
    .onFinalize(() => {
      x.value = withSpring(0, SPRING)
      armed.value = -1
    })

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View style={$wrap}>
      {leftCount > 0 ? (
        <ActionPanel
          side="left"
          actions={leftActions!}
          x={x}
          indexFor={indexFor}
          armPx={primaryPx}
          fullPx={secondaryPx}
        />
      ) : null}
      {rightCount > 0 ? (
        <ActionPanel
          side="right"
          actions={rightActions!}
          x={x}
          indexFor={indexFor}
          armPx={primaryPx}
          fullPx={secondaryPx}
        />
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  )
}

/**
 * The colour behind the row on one side.
 *
 * It is exactly as wide as the row has moved, so it reads as the row uncovering
 * it rather than as a separate panel sliding in. Every action's icon is rendered
 * and cross-faded, because which glyph to draw cannot be decided inside a
 * worklet — only its opacity can.
 */
const ActionPanel: FC<{
  side: "left" | "right"
  actions: SwipeAction[]
  x: SharedValue<number>
  indexFor: (offset: number) => number
  /** Drag distance at which the glyph reaches full size. */
  armPx: number
  /** Drag distance at which it reaches {@link SCALE_MAX} and stops growing. */
  fullPx: number
}> = ({ side, actions, x, indexFor, armPx, fullPx }) => {
  const {
    theme: { colors },
  } = useAppTheme()
  const backgrounds = actions.map((a) => a.background)
  const resting = backgrounds[0]

  const panelStyle = useAnimatedStyle(() => {
    const offset = x.value
    const mine = side === "left" ? offset > 0 : offset < 0
    if (!mine) return { width: 0, backgroundColor: resting }
    const index = indexFor(offset)
    return {
      width: Math.abs(offset),
      backgroundColor: index > 0 ? backgrounds[index] : resting,
    }
  })

  return (
    <Animated.View
      style={[$panel, side === "left" ? $panelLeft : $panelRight, panelStyle]}
      pointerEvents="none"
    >
      {actions.map((action, i) => (
        <PanelContent
          key={action.key}
          action={action}
          index={i}
          side={side}
          x={x}
          indexFor={indexFor}
          armPx={armPx}
          fullPx={fullPx}
          fallback={colors.onError}
        />
      ))}
    </Animated.View>
  )
}

const PanelContent: FC<{
  action: SwipeAction
  index: number
  side: "left" | "right"
  x: SharedValue<number>
  indexFor: (offset: number) => number
  armPx: number
  fullPx: number
  fallback: string
}> = ({ action, index, side, x, indexFor, armPx, fullPx, fallback }) => {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(x.value)
    // Below the first threshold nothing is armed, but the first action still
    // shows: the swipe has to say what it will do before it will do it.
    const shown = Math.max(indexFor(x.value), 0)
    return {
      // Fade in over the first few points so the glyph does not pop into
      // existence the instant the row moves.
      opacity: shown === index ? interpolate(distance, [0, 18], [0, 1], Extrapolation.CLAMP) : 0,
      // Read straight off the drag distance and clamped at both ends, so it
      // grows under the thumb and holds wherever the thumb holds — it only
      // shrinks again when the row itself springs home.
      transform: [
        {
          scale: interpolate(
            distance,
            [0, armPx, fullPx],
            [SCALE_MIN, 1, SCALE_MAX],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }
  })
  const fg = action.foreground ?? fallback
  return (
    <Animated.View
      testID={`swipe-action-${action.key}`}
      style={[$content, side === "left" ? $contentLeft : $contentRight, style]}
    >
      <AppIcon name={action.icon} size={20} color={fg} />
      <Text text={action.label} size="xxs" weight="medium" style={{ color: fg }} />
    </Animated.View>
  )
}

// Clips the panels to the row, so a panel as wide as the screen cannot paint
// over its neighbours while the row is mid-swipe.
const $wrap: ViewStyle = { overflow: "hidden" }
const $panel: ViewStyle = { position: "absolute", top: 0, bottom: 0 }
const $panelLeft: ViewStyle = { left: 0 }
const $panelRight: ViewStyle = { right: 0 }
// Pinned near the screen edge rather than centred: centred, the glyph slides
// outward as the panel grows and the eye tracks it instead of the row.
const $content: ViewStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  width: 76,
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
}
const $contentLeft: ViewStyle = { left: 0 }
const $contentRight: ViewStyle = { right: 0 }
