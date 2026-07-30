import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
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
import { hapticSuccess, hapticWarning } from "@/utils/haptics"

export type ToastVariant = "default" | "success" | "error"

/** Trailing button on a toast — typically the undo affordance for a write. */
export interface ToastAction {
  label: string
  onPress: () => void
}

export interface ToastOptions {
  variant?: ToastVariant
  action?: ToastAction
  /** Visible duration in ms. Actionable toasts stay up longer by default. */
  duration?: number
}

interface QueuedToast {
  id: number
  message: string
  variant: ToastVariant
  action?: ToastAction
  duration: number
}

type ShowFn = (message: string, options?: ToastOptions) => void

const ToastContext = createContext<{ show: ShowFn } | null>(null)

/** Returns a `show(message, { variant, action })` function; a no-op outside the provider. */
export const useToast = (): ShowFn => useContext(ToastContext)?.show ?? (() => {})

const ICON: Record<ToastVariant, keyof typeof Ionicons.glyphMap | null> = {
  default: null,
  success: "checkmark-circle",
  error: "alert-circle",
}

const HIDDEN_Y = 12
const DEFAULT_MS = 2600
const ACTIONABLE_MS = 5000
const SWIPE_DISMISS = 72
const OFFSCREEN_X = 500
const SPRING = { damping: 20, stiffness: 240, mass: 0.7 }

export const ToastProvider: FC<PropsWithChildren> = ({ children }) => {
  // Only the head of the queue is on screen; the rest wait their turn instead
  // of clobbering each other (one swipe can fire several writes in a row).
  const [queue, setQueue] = useState<QueuedToast[]>([])
  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()
  const {
    theme: { colors, radius },
  } = useAppTheme()

  const opacity = useSharedValue(0)
  const translateY = useSharedValue(HIDDEN_Y)
  const translateX = useSharedValue(0)

  const current = queue[0] ?? null

  const show = useCallback<ShowFn>((message, options) => {
    setQueue((q) => [
      ...q,
      {
        id: nextId.current++,
        message,
        variant: options?.variant ?? "default",
        action: options?.action,
        duration: options?.duration ?? (options?.action ? ACTIONABLE_MS : DEFAULT_MS),
      },
    ])
  }, [])

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const pop = useCallback(() => {
    clearTimer()
    setQueue((q) => q.slice(1))
  }, [clearTimer])

  const hide = useCallback(() => {
    clearTimer()
    opacity.value = withTiming(0, { duration: 180 })
    translateY.value = withTiming(HIDDEN_Y, { duration: 180 }, (finished) => {
      if (finished) runOnJS(pop)()
    })
  }, [clearTimer, opacity, translateY, pop])

  // Animate the head of the queue in, then schedule its exit.
  useEffect(() => {
    if (!current) return
    translateX.value = 0
    translateY.value = HIDDEN_Y
    opacity.value = withTiming(1, { duration: 180 })
    translateY.value = withSpring(0, SPRING)
    if (current.variant === "success") hapticSuccess()
    else if (current.variant === "error") hapticWarning()
    timer.current = setTimeout(hide, current.duration)
    return clearTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_DISMISS || Math.abs(e.velocityX) > 700) {
        const away = (e.translationX < 0 ? -1 : 1) * OFFSCREEN_X
        translateX.value = withTiming(away, { duration: 160 }, (finished) => {
          if (finished) runOnJS(pop)()
        })
      } else {
        translateX.value = withSpring(0, SPRING)
      }
    })

  const $anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }))

  const bg =
    current?.variant === "success"
      ? colors.success
      : current?.variant === "error"
        ? colors.error
        : colors.text
  const fg =
    current?.variant === "success"
      ? colors.successBackground
      : current?.variant === "error"
        ? colors.onError
        : colors.background
  const icon = current ? ICON[current.variant] : null

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {current ? (
        <GestureDetector gesture={pan}>
          <Animated.View
            testID="toast"
            style={[
              $toast,
              {
                bottom: insets.bottom + 96,
                backgroundColor: bg,
                borderRadius: radius.lg,
              },
              $anim,
            ]}
          >
            {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
            <Text
              text={current.message}
              size="sm"
              weight="medium"
              numberOfLines={2}
              style={[$message, { color: fg }]}
            />
            {current.action ? (
              <>
                <View style={[$divider, { backgroundColor: fg }]} />
                <Pressable
                  testID="toast-action"
                  hitSlop={8}
                  onPress={() => {
                    current.action?.onPress()
                    hide()
                  }}
                >
                  <Text
                    text={current.action.label}
                    size="sm"
                    weight="semiBold"
                    style={{ color: fg }}
                  />
                </Pressable>
              </>
            ) : null}
          </Animated.View>
        </GestureDetector>
      ) : null}
    </ToastContext.Provider>
  )
}

const $toast: ViewStyle = {
  position: "absolute",
  left: 24,
  right: 24,
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingVertical: 13,
  paddingHorizontal: 16,
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
}
const $message: ViewStyle = { flexShrink: 1, flexGrow: 1 }
const $divider: ViewStyle = { width: 1, height: 18, opacity: 0.25 }
