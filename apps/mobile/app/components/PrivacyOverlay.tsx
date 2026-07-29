import { FC, useEffect, useState } from "react"
import { AppState, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

/**
 * Hides app content with a branded overlay whenever the app is not active
 * (app switcher, Face ID prompt, backgrounding) — a privacy screen (COS-234).
 */
export const PrivacyOverlay: FC = () => {
  const {
    theme: { colors },
  } = useAppTheme()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setHidden(state !== "active"))
    return () => sub.remove()
  }, [])

  if (!hidden) return null
  return (
    <View style={[$overlay, { backgroundColor: colors.background }]} pointerEvents="none">
      <Text preset="heading" text="CompanyOS" style={{ color: colors.tint }} />
    </View>
  )
}

const $overlay: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
}
