import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"
import { Animated, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export type ToastVariant = "default" | "success" | "error"
export interface ToastOptions {
  variant?: ToastVariant
}

type ToastState = { message: string; variant: ToastVariant }
type ShowFn = (message: string, options?: ToastOptions) => void
type ToastContextValue = { show: ShowFn }

const ToastContext = createContext<ToastContextValue | null>(null)

/** Returns a `show(message, { variant })` function; a no-op outside the provider. */
export const useToast = (): ShowFn => useContext(ToastContext)?.show ?? (() => {})

const ICON: Record<ToastVariant, keyof typeof Ionicons.glyphMap | null> = {
  default: null,
  success: "checkmark-circle",
  error: "alert-circle",
}

export const ToastProvider: FC<PropsWithChildren> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(12)).current
  const insets = useSafeAreaInsets()
  const {
    theme: { colors, radius },
  } = useAppTheme()

  const show = useCallback<ShowFn>(
    (m, options) => {
      setToast({ message: m, variant: options?.variant ?? "default" })
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
      ]).start()
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 12, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) setToast(null)
        })
      }, 2600)
    },
    [opacity, translateY],
  )

  const bg =
    toast?.variant === "success"
      ? colors.success
      : toast?.variant === "error"
        ? colors.error
        : colors.text
  const fg =
    toast?.variant === "success"
      ? colors.successBackground
      : toast?.variant === "error"
        ? colors.onError
        : colors.background
  const icon = toast ? ICON[toast.variant] : null

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            $toast,
            {
              bottom: insets.bottom + 96,
              opacity,
              transform: [{ translateY }],
              backgroundColor: bg,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={$row}>
            {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
            <Text text={toast.message} size="sm" weight="medium" style={{ color: fg, flexShrink: 1 }} />
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  )
}

const $toast: ViewStyle = {
  position: "absolute",
  left: 24,
  right: 24,
  paddingVertical: 13,
  paddingHorizontal: 16,
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
}
const $row: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 }
