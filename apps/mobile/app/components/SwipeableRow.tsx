import { FC, ReactNode, useRef } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticImpact } from "@/utils/haptics"

export interface SwipeAction {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  /** Background color of the action panel. */
  background: string
  /** Icon/label color (defaults to white). */
  foreground?: string
  onPress: () => void
}

const ACTION_W = 76

/**
 * A row with configurable swipe actions (left and/or right). Built on
 * gesture-handler's ReanimatedSwipeable. Fires a haptic tick when opened and
 * closes itself after an action is chosen.
 */
export const SwipeableRow: FC<{
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
}> = ({ children, leftActions, rightActions }) => {
  const ref = useRef<SwipeableMethods>(null)

  const renderActions = (actions: SwipeAction[]) => () => (
    <View style={$actions}>
      {actions.map((a) => (
        <ActionButton
          key={a.key}
          action={a}
          onDone={() => ref.current?.close()}
        />
      ))}
    </View>
  )

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      overshootFriction={8}
      rightThreshold={40}
      leftThreshold={40}
      onSwipeableWillOpen={hapticImpact}
      renderLeftActions={leftActions?.length ? renderActions(leftActions) : undefined}
      renderRightActions={rightActions?.length ? renderActions(rightActions) : undefined}
    >
      {children}
    </ReanimatedSwipeable>
  )
}

const ActionButton: FC<{ action: SwipeAction; onDone: () => void }> = ({ action, onDone }) => {
  const {
    theme: { colors },
  } = useAppTheme()
  const fg = action.foreground ?? colors.onError
  return (
    <Pressable
      testID={`swipe-action-${action.key}`}
      onPress={() => {
        action.onPress()
        onDone()
      }}
      style={[$action, { backgroundColor: action.background }]}
    >
      <Ionicons name={action.icon} size={20} color={fg} />
      <Text text={action.label} size="xxs" weight="medium" style={{ color: fg }} />
    </Pressable>
  )
}

const $actions: ViewStyle = { flexDirection: "row" }
const $action: ViewStyle = {
  width: ACTION_W,
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
}
